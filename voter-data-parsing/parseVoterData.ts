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
import { MeiliSearch } from "meilisearch";

// {"OBJECTID":"40546","ESN":"261","CITY":"MURFREESBORO","GlobalID":"{4D96048E-F2E2-4DD6-9054-4430D03D5335}","Shape.STArea()":"1,869,993,867.68","Shape.STLength()":"1,237,601.61"}
interface MunicipalMeta {
  OBJECTID: string;
  ESN: string;
  CITY: string;
  GlobalID: string;
}

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

const meilisearchClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
});

// Map DistrictType to GeoJSON filenames
const LAYER_FILES: Partial<Record<DistrictType, string>> = {
  [DistrictType.COMMISSIONER]: "Commission_Districts.geojson",
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
  Building?: string;
  Unit?: string;
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

interface MeiliAddressDoc {
  id: string;
  address: string;
  normalizedAddress: string;
  city: string | null;
  zip: string | null;
  districtGroupId: string | null;
}

interface BatchItem {
  addressData: AddressData;
  districts: Prisma.DistrictToVoterAddressCreateWithoutVoterAddressInput[];
  districtGroupId: string;
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

function districtKey(type: DistrictType, name: string, number: number | null) {
  return `${type}:${String(name).trim()}:${number ?? 0}`;
}

async function ensureDistricts(layers: LoadedLayer[]) {
  const map = new Map<string, string>();

  for (const layer of layers) {
    console.log(`Ensuring districts for layer: ${layer.type}`);
    for (const feature of layer.features) {
      const info = extractDistrictInfo(feature.properties, layer.type);
      const key = districtKey(layer.type, info.name, info.number);
      if (map.has(key)) continue;

      try {
        console.log(`Upserting district: ${info.name} (${layer.type})`);
        const district = await prisma.district.upsert({
          where: {
            type_name_number: {
              type: layer.type,
              name: info.name,
              number: info.number ?? 0,
            },
          },
          update: {
            meta: feature.properties,
          },
          create: {
            type: layer.type,
            name: info.name,
            number: info.number,
            meta: feature.properties,
          },
        });

        console.log(`  ✓ Upserted with ID: ${district.id}`);
        map.set(key, district.id);
      } catch (e) {
        console.error(
          `Failed to upsert district ${info.name} (${layer.type}):`,
          e,
        );
      }
    }
  }

  return map;
}

async function ensureAllDistrict(): Promise<string> {
  console.log("Ensuring 'ALL' district exists...");
  const allDistrict = await prisma.district.upsert({
    where: {
      type_name_number: {
        type: DistrictType.ALL,
        name: "ALL",
        number: 0,
      },
    },
    update: {},
    create: {
      type: DistrictType.ALL,
      name: "ALL",
      number: 0,
    },
  });
  console.log(`  ✓ 'ALL' district ID: ${allDistrict.id}`);
  return allDistrict.id;
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
  } else if (type === DistrictType.MUNICIPAL) {
    const meta = props as unknown as MunicipalMeta;
    name = meta.CITY || props.NAME || "Unknown Municipality";
    number = meta.ESN ? Number(meta.ESN) : null;
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

async function processAddresses(
  layers: LoadedLayer[],
  districtIdMap: Map<string, string>,
  allDistrictId: string,
) {
  const stream = createReadStream(CSV_FILE).pipe(
    csv(),
  ) as unknown as AsyncIterable<CsvRow>;
  let batch: BatchItem[] = [];
  let count = 0;

  const districtGroupMap = new Map<string, string>();

  console.log("Starting address processing...");

  for await (const row of stream) {
    const lat = parseFloat(row.Latitude);
    const lon = parseFloat(row.Longitude);

    if (isNaN(lat) || isNaN(lon)) continue;

    const addressRaw = [
      row.Add_Number,
      row.StNam_Full,
      row.Building,
      row.Unit,
      row.Post_City,
    ]
      .filter(Boolean)
      .join(" ");

    const fullAddress = [
      row.Add_Number,
      row.StNam_Full,
      row.Building,
      row.Unit,
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
    const addedDistrictIds = new Set<string>([allDistrictId]);

    // Always connect to 'ALL' district
    districtConnects.push({
      district: {
        connect: { id: allDistrictId },
      },
    });

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
            const key = districtKey(layer.type, info.name, info.number);
            const id = districtIdMap.get(key);
            if (id && !addedDistrictIds.has(id)) {
              addedDistrictIds.add(id);
              districtConnects.push({
                district: {
                  connect: { id },
                },
              });
            }
            break;
          }
        } catch (e) {
          console.error("Error processing address:", e);
          // Ignore topology errors
        }
      }
    }

    const districtIds = Array.from(addedDistrictIds).sort();
    const groupHash = districtIds.join(",");

    let districtGroupId = districtGroupMap.get(groupHash);
    if (!districtGroupId && !DRY_RUN) {
      const g = await prisma.districtGroup.upsert({
        where: { hash: groupHash },
        create: {
          hash: groupHash,
          districts: {
            create: districtIds.map((dId) => ({ districtId: dId })),
          },
        },
        update: {},
      });
      districtGroupId = g.id;
      districtGroupMap.set(groupHash, districtGroupId);
    } else if (!districtGroupId && DRY_RUN) {
      districtGroupId = "dry-run-group-" + groupHash;
      districtGroupMap.set(groupHash, districtGroupId);
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
      districtGroupId: districtGroupId as string,
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

async function setupMeilisearch() {
  if (DRY_RUN) return;
  console.log("Setting up Meilisearch index...");
  const index = meilisearchClient.index("addresses");

  console.log("  Clearing existing Meilisearch documents...");
  try {
    const deleteBatch = await index.deleteAllDocuments();
    console.log(`  ✓ Meilisearch clear task enqueued: ${deleteBatch.taskUid}`);
  } catch (e) {
    console.error("  ❌ Failed to clear Meilisearch documents:", e);
  }

  // Basic configuration
  await index.updateSettings({
    searchableAttributes: ["address", "city", "zip"],
    filterableAttributes: ["city", "zip", "districtGroupId"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });
  console.log("  ✓ Meilisearch settings updated");
}

async function saveBatchToMeilisearch(docs: MeiliAddressDoc[]) {
  if (DRY_RUN || docs.length === 0) return;

  try {
    const task = await meilisearchClient
      .index("addresses")
      .addDocuments(docs, { primaryKey: "id" });
    if (VERBOSE)
      console.log(`  ✓ Meilisearch sync task enqueued: ${task.taskUid}`);
  } catch (error) {
    console.error("Failed to sync batch to Meilisearch:", error);
  }
}

async function saveBatch(batch: BatchItem[]) {
  if (DRY_RUN) return;
  const meiliDocs: MeiliAddressDoc[] = [];

  for (const item of batch) {
    try {
      const created = await prisma.voterAddress.create({
        data: {
          ...item.addressData,
          districtGroupId: item.districtGroupId,
          districts: {
            create: item.districts,
          },
        },
      });

      meiliDocs.push({
        id: created.id,
        address: created.address,
        normalizedAddress: created.normalizedAddress,
        city: created.city,
        zip: created.zip,
        districtGroupId: created.districtGroupId,
      });
    } catch (e) {
      if (VERBOSE)
        console.error("Failed to save address:", item.addressData.address, e);
    }
  }

  await saveBatchToMeilisearch(meiliDocs);
}

async function main() {
  try {
    console.log("🚀 Voter Data Import Started");
    if (DRY_RUN) console.log("⚠️ DRY RUN MODE");

    const layers = await loadLayers();
    if (layers.length === 0) {
      console.warn(
        "No layers loaded. Ensure GeoJSON files are in voter-data-parsing/",
      );
    }

    const districtIdMap = await ensureDistricts(layers);
    const allDistrictId = await ensureAllDistrict();

    await setupMeilisearch();

    if (!DRY_RUN) {
      console.log("Cleaning up existing voter addresses and associations...");
      const deletedAssoc = await prisma.districtToVoterAddress.deleteMany({});
      const deletedAddresses = await prisma.voterAddress.deleteMany({});
      console.log(
        `  ✓ Deleted ${deletedAssoc.count} associations and ${deletedAddresses.count} addresses.`,
      );

      console.log("Cleaning up existing district groups...");
      const deletedGroupAssoc =
        await prisma.districtGroupToDistrict.deleteMany({});
      const deletedGroups = await prisma.districtGroup.deleteMany({});
      console.log(
        `  ✓ Deleted ${deletedGroupAssoc.count} group associations and ${deletedGroups.count} groups.`,
      );
    }

    await processAddresses(layers, districtIdMap, allDistrictId);

    console.log("Done.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
