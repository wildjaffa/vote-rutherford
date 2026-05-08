import { createReadStream } from "stream";
import csv from "csv-parser";
import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { DistrictType, ImportJobStatus } from "../generated/prisma/enums";
import { normalizeAddress } from "./utils/addressNormalizer";
import prisma from "./prisma";
import { Prisma } from "../generated/prisma/client";
import { MeiliSearch } from "meilisearch";

// Configuration
const BATCH_SIZE = 500;

const meilisearchClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
});

interface MunicipalMeta {
  OBJECTID: string;
  ESN: string;
  CITY: string;
  GlobalID: string;
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

interface DistrictMapping {
  oldDistrictId: string;
  newDistrictId: string;
  type: DistrictType;
  name: string;
  number: number | null;
}

export interface ImportProgress {
  stage: string;
  processed: number;
  total?: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  districtMappings: DistrictMapping[];
  jobId: string;
  error?: string;
}

function districtKey(type: DistrictType, name: string, number: number | null) {
  return `${type}:${String(name).trim()}:${number ?? 0}`;
}

export async function loadGeoJsonLayers(
  geoJsonFiles: Record<string, string>,
): Promise<LoadedLayer[]> {
  const layers: LoadedLayer[] = [];

  for (const [type, geoJsonContent] of Object.entries(geoJsonFiles)) {
    try {
      const geojson = JSON.parse(geoJsonContent) as {
        features: DistrictFeature[];
      };
      if (geojson.features && Array.isArray(geojson.features)) {
        layers.push({
          type: type as DistrictType,
          features: geojson.features,
        });
      }
    } catch (err) {
      throw new Error(`Failed to parse GeoJSON for ${type}: ${err}`);
    }
  }
  return layers;
}

export async function upsertDistricts(
  layers: LoadedLayer[],
  jobId: string,
  onProgress?: (progress: ImportProgress) => void,
): Promise<{
  districtIdMap: Map<string, string>;
  mappings: DistrictMapping[];
}> {
  const map = new Map<string, string>();
  const mappings: DistrictMapping[] = [];

  onProgress?.({
    stage: "districts",
    processed: 0,
    message: "Starting district upsert...",
  });

  for (const layer of layers) {
    onProgress?.({
      stage: "districts",
      processed: 0,
      message: `Processing ${layer.type} districts...`,
    });

    for (const feature of layer.features) {
      const info = extractDistrictInfo(feature.properties, layer.type);
      const key = districtKey(layer.type, info.name, info.number);

      if (map.has(key)) continue;

      try {
        // Check if district already exists
        const existingDistrict = await prisma.district.findUnique({
          where: {
            type_name_number: {
              type: layer.type,
              name: info.name,
              number: info.number ?? 0,
            },
          },
        });

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
            oldDistrictId: existingDistrict?.id,
          },
        });

        map.set(key, district.id);

        if (existingDistrict) {
          mappings.push({
            oldDistrictId: existingDistrict.id,
            newDistrictId: district.id,
            type: layer.type,
            name: info.name,
            number: info.number,
          });
        }
      } catch (e) {
        throw new Error(
          `Failed to upsert district ${info.name} (${layer.type}): ${e}`,
        );
      }
    }
  }

  onProgress?.({
    stage: "districts",
    processed: map.size,
    message: `Upserted ${map.size} districts`,
  });

  return { districtIdMap: map, mappings };
}

export async function ensureAllDistrict(): Promise<string> {
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

export async function processAddressCsv(
  csvContent: string,
  layers: LoadedLayer[],
  districtIdMap: Map<string, string>,
  allDistrictId: string,
  jobId: string,
  onProgress?: (progress: ImportProgress) => void,
): Promise<void> {
  const stream = createReadStream(Buffer.from(csvContent), {
    encoding: "utf8",
  }).pipe(csv()) as unknown as AsyncIterable<CsvRow>;

  let batch: BatchItem[] = [];
  let count = 0;
  let totalRows = 0;

  // Count total rows first
  const lines = csvContent.split("\n").filter((line) => line.trim());
  totalRows = lines.length - 1; // Subtract header

  onProgress?.({
    stage: "addresses",
    processed: 0,
    total: totalRows,
    message: "Starting address processing...",
  });

  const districtGroupMap = new Map<string, string>();

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
        } catch {
          // Ignore topology errors
        }
      }
    }

    const districtIds = Array.from(addedDistrictIds).sort();
    const groupHash = districtIds.join(",");

    let districtGroupId = districtGroupMap.get(groupHash);
    if (!districtGroupId) {
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
      districtGroupId: districtGroupId,
    });

    count++;
    if (count % 100 === 0) {
      onProgress?.({
        stage: "addresses",
        processed: count,
        total: totalRows,
        message: `Processed ${count}/${totalRows} addresses...`,
      });
    }

    if (batch.length >= BATCH_SIZE) {
      await saveBatch(batch, jobId, onProgress);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await saveBatch(batch, jobId, onProgress);
  }

  onProgress?.({
    stage: "addresses",
    processed: count,
    total: totalRows,
    message: `Completed processing ${count} addresses`,
  });
}

export async function setupMeilisearch(): Promise<void> {
  const index = meilisearchClient.index("addresses");

  try {
    await index.deleteAllDocuments();
  } catch (e) {
    console.error("Failed to clear Meilisearch documents:", e);
  }

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
}

async function saveBatchToMeilisearch(docs: MeiliAddressDoc[]): Promise<void> {
  if (docs.length === 0) return;

  try {
    await meilisearchClient
      .index("addresses")
      .addDocuments(docs, { primaryKey: "id" });
  } catch (error) {
    console.error("Failed to sync batch to Meilisearch:", error);
  }
}

async function saveBatch(
  batch: BatchItem[],
  jobId: string,
  onProgress?: (progress: ImportProgress) => void,
): Promise<void> {
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
      console.error("Failed to save address:", item.addressData.address);
    }
  }

  await saveBatchToMeilisearch(meiliDocs);

  // Update job progress
  await prisma.districtImportJob.update({
    where: { id: jobId },
    data: {
      progress: {
        processedAddresses:
          ((
            await prisma.districtImportJob.findUnique({
              where: { id: jobId },
              select: { progress: true },
            })
          )?.progress as any) || 0 + batch.length,
      },
    },
  });
}

export async function cleanupOldData(): Promise<void> {
  const deletedAssoc = await prisma.districtToVoterAddress.deleteMany({});
  const deletedAddresses = await prisma.voterAddress.deleteMany({});
  const deletedGroupAssoc = await prisma.districtGroupToDistrict.deleteMany({});
  const deletedGroups = await prisma.districtGroup.deleteMany({});

  console.log(
    `Cleaned up ${deletedAssoc.count} associations, ${deletedAddresses.count} addresses, ${deletedGroupAssoc.count} group associations, ${deletedGroups.count} groups.`,
  );
}

export async function updateCandidateDistricts(
  mappings: DistrictMapping[],
): Promise<void> {
  for (const mapping of mappings) {
    await prisma.race.updateMany({
      where: {
        districtId: mapping.oldDistrictId,
      },
      data: {
        districtId: mapping.newDistrictId,
      },
    });
  }
}

export async function runDistrictImport(
  csvContent: string,
  geoJsonFiles: Record<string, string>,
  userId: string,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const job = await prisma.districtImportJob.create({
    data: {
      status: ImportJobStatus.RUNNING,
      startedAt: new Date(),
      createdBy: userId,
      progress: { stage: "initializing" },
    },
  });

  try {
    onProgress?.({
      stage: "initializing",
      processed: 0,
      message: "Loading GeoJSON layers...",
    });

    const layers = await loadGeoJsonLayers(geoJsonFiles);

    onProgress?.({
      stage: "districts",
      processed: 0,
      message: "Upserting districts...",
    });

    const { districtIdMap, mappings } = await upsertDistricts(
      layers,
      job.id,
      onProgress,
    );
    const allDistrictId = await ensureAllDistrict();

    await prisma.districtImportJob.update({
      where: { id: job.id },
      data: { districtMapping: mappings },
    });

    onProgress?.({
      stage: "cleanup",
      processed: 0,
      message: "Cleaning up old data...",
    });

    await cleanupOldData();

    onProgress?.({
      stage: "meilisearch",
      processed: 0,
      message: "Setting up Meilisearch...",
    });

    await setupMeilisearch();

    onProgress?.({
      stage: "addresses",
      processed: 0,
      message: "Processing addresses...",
    });

    await processAddressCsv(
      csvContent,
      layers,
      districtIdMap,
      allDistrictId,
      job.id,
      onProgress,
    );

    onProgress?.({
      stage: "candidates",
      processed: 0,
      message: "Updating candidate districts...",
    });

    await updateCandidateDistricts(mappings);

    await prisma.districtImportJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.COMPLETED,
        completedAt: new Date(),
        progress: { stage: "completed" },
      },
    });

    return { success: true, districtMappings: mappings, jobId: job.id };
  } catch (error) {
    await prisma.districtImportJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      success: false,
      districtMappings: [],
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
