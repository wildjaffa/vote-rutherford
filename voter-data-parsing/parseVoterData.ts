import "dotenv/config";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import csv from "csv-parser";
import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { DistrictType } from "../src/generated/prisma/enums";
import { normalizeAddress } from "../src/lib/utils/addressNormalizer";
import prisma from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";

/**
 * Voter Address Parsing & Import Script
 */

// Configuration
const CSV_FILE = path.join(
  process.cwd(),
  "voter-data-parsing",
  "Tennessee_NG911_Address_Points.csv",
);
const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Map DistrictType to GeoJSON filenames
const LAYER_FILES: Partial<Record<DistrictType, string>> = {
  [DistrictType.PRECINCT]: "Precinct_Hub_Data.geojson",
  [DistrictType.US_HOUSE]: "US_House_Districts.geojson",
  [DistrictType.STATE_SENATE]: "TN_Senate_Districts.geojson",
  [DistrictType.STATE_HOUSE]: "TN_House_Districts.geojson",
  [DistrictType.JUDICIAL]: "Judicial_Districts.geojson",
  [DistrictType.COUNTY]: "County_Districts.geojson",
  [DistrictType.MUNICIPAL]: "RC_Jurisdictions.geojson",
  [DistrictType.SCHOOL]: "School_Board_Zones.geojson",
  [DistrictType.ROAD]: "Road_Board_Zones.geojson",
};

interface DistrictProperties {
  NAME?: string;
  DISTRICT?: string | number;
  Precinct?: string;
  ID?: string | number;
  [key: string]: Prisma.InputJsonValue | undefined;
}

interface DistrictFeature {
  type: "Feature";
  properties: DistrictProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface LoadedLayer {
  type: DistrictType;
  features: DistrictFeature[];
}

interface CsvRow {
  Latitude: string;
  Longitude: string;
  Add_Number: string;
  StNam_Full: string;
  Post_City: string;
  State: string;
  Zip_Code: string;
  [key: string]: string;
}

interface AddressData {
  address: string;
  normalizedAddress: string;
  city: string;
  zip: string;
  latitude: number;
  longitude: number;
}

interface BatchItem {
  addressData: AddressData;
  districts: Prisma.DistrictToVoterAddressCreateWithoutVoterAddressInput[];
}

async function loadLayers(): Promise<LoadedLayer[]> {
  const layers: LoadedLayer[] = [];

  for (const [type, filename] of Object.entries(LAYER_FILES)) {
    const filePath = path.join(process.cwd(), "voter-data-parsing", filename);
    if (fs.existsSync(filePath)) {
      console.log(`Loading layer: ${type} from ${filename}`);
      try {
        const data = fs.readFileSync(filePath, "utf-8");
        const geojson = JSON.parse(data) as { features: DistrictFeature[] };
        if (geojson.features && Array.isArray(geojson.features)) {
          layers.push({
            type: type as DistrictType,
            features: geojson.features,
          });
          console.log(`  ✓ Loaded ${geojson.features.length} features`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to parse ${filename}:`, err);
      }
    } else {
      if (VERBOSE) console.warn(`  ⚠️ File not found for ${type}: ${filename}`);
    }
  }
  return layers;
}

function extractDistrictInfo(
  props: DistrictProperties,
  type: DistrictType,
): { name: string; number: number | null } {
  let name = "";
  let number: number | null = null;

  if (type === DistrictType.PRECINCT) {
    name = props.Precinct || props.NAME || "Unknown Precinct";
    number = props.DISTRICT ? Number(props.DISTRICT) : null;
  } else {
    name =
      props.NAME || props.DISTRICT
        ? String(props.DISTRICT)
        : `${type} District`;
    if (typeof props.DISTRICT === "number") {
      number = props.DISTRICT;
    } else if (props.DISTRICT && !isNaN(Number(props.DISTRICT))) {
      number = Number(props.DISTRICT);
    }
  }

  return { name: String(name).trim(), number };
}

async function processAddresses(layers: LoadedLayer[]) {
  const stream = createReadStream(CSV_FILE).pipe(
    csv(),
  ) as unknown as AsyncIterable<CsvRow>;
  let batch: BatchItem[] = [];
  let count = 0;

  console.log("Starting address processing...");

  for await (const row of stream) {
    const lat = parseFloat(row.Latitude);
    const lon = parseFloat(row.Longitude);

    if (isNaN(lat) || isNaN(lon)) continue;

    const addressRaw = [row.Add_Number, row.StNam_Full, row.Post_City]
      .filter(Boolean)
      .join(" ");

    const fullAddress = [
      row.Add_Number,
      row.StNam_Full,
      row.Post_City,
      row.State,
      row.Zip_Code,
    ]
      .filter(Boolean)
      .join(", ");

    const normalizedSearch = normalizeAddress(addressRaw);

    const districtConnects: Prisma.DistrictToVoterAddressCreateWithoutVoterAddressInput[] =
      [];
    const point = turf.point([lon, lat]);

    for (const layer of layers) {
      for (const feature of layer.features) {
        try {
          // Determine logic for polygon vs multipolygon
          let poly: Feature<Polygon | MultiPolygon>;
          if (feature.geometry.type === "Polygon") {
            poly = turf.polygon(feature.geometry.coordinates as number[][][]);
          } else if (feature.geometry.type === "MultiPolygon") {
            poly = turf.multiPolygon(
              feature.geometry.coordinates as number[][][][],
            );
          } else {
            continue;
          }

          if (turf.booleanPointInPolygon(point, poly)) {
            const info = extractDistrictInfo(feature.properties, layer.type);

            districtConnects.push({
              district: {
                connectOrCreate: {
                  where: {
                    type_name_number: {
                      type: layer.type,
                      name: info.name,
                      number: info.number ?? 0,
                    },
                  },
                  create: {
                    type: layer.type,
                    name: info.name,
                    number: info.number,
                    meta: feature.properties,
                  },
                },
              },
            });
            break;
          }
        } catch (e) {
          console.error("Error processing address:", e);
          // Ignore topology errors
        }
      }
    }

    batch.push({
      addressData: {
        address: fullAddress,
        normalizedAddress: normalizedSearch,
        city: row.Post_City,
        zip: row.Zip_Code,
        latitude: lat,
        longitude: lon,
      },
      districts: districtConnects,
    });

    count++;
    if (count % 1000 === 0) process.stdout.write(`.`);

    if (batch.length >= BATCH_SIZE) {
      await saveBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await saveBatch(batch);
  }
  console.log(`\nProcessed ${count} addresses.`);
}

async function saveBatch(batch: BatchItem[]) {
  if (DRY_RUN) {
    return;
  }

  for (const item of batch) {
    try {
      await prisma.voterAddress.create({
        data: {
          ...item.addressData,
          districts: {
            create: item.districts,
          },
        },
      });
    } catch (e) {
      if (VERBOSE)
        console.error("Failed to save address:", item.addressData.address, e);
    }
  }
}

async function main() {
  try {
    console.log("🚀 Voter Data Import Started");
    if (DRY_RUN) console.log("⚠️ DRY RUN MODE");

    const layers = await loadLayers();
    if (layers.length === 0)
      console.warn(
        "No layers loaded. Ensure GeoJSON files are in voter-data-parsing/",
      );

    await processAddresses(layers);

    console.log("Done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
