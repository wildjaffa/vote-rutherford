import "dotenv/config";
import { PgBoss, type Job } from "pg-boss";
import prisma from "../prisma";
import {
  upsertAddressDocuments,
  type AddressIndexDocument,
  type SuggestedPollingSite,
} from "../addressLookup";
import { POLLING_LOCATION_QUEUE } from "./pollingLocationQueue";

const BATCH_SIZE = 500;
const EARTH_RADIUS_METERS = 6_371_000;

type Site = {
  id: string;
  name: string;
  type: "EARLY_VOTING" | "DAY_OF_VOTING";
  voterAddress: {
    address: string;
    city: string | null;
    zip: string | null;
    latitude: number;
    longitude: number;
  };
};

type VoterAddress = {
  id: string;
  address: string;
  normalizedAddress: string;
  city: string | null;
  zip: string | null;
  latitude: number;
  longitude: number;
  districtGroupId: string | null;
};

function distanceMeters(
  latitude: number,
  longitude: number,
  otherLatitude: number,
  otherLongitude: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(otherLatitude - latitude);
  const longitudeDelta = toRadians(otherLongitude - longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(otherLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))))
  );
}

function nearestSite(
  address: VoterAddress,
  sites: Site[],
  type: Site["type"],
): Site | null {
  let closest: Site | null = null;
  let closestDistance = Infinity;

  for (const site of sites) {
    if (site.type !== type) continue;
    const distance = distanceMeters(
      address.latitude,
      address.longitude,
      site.voterAddress.latitude,
      site.voterAddress.longitude,
    );
    if (distance < closestDistance) {
      closest = site;
      closestDistance = distance;
    }
  }

  return closest;
}

function toSuggestedSite(site: Site | null): SuggestedPollingSite | null {
  if (!site) return null;
  return {
    id: site.id,
    name: site.name,
    address: site.voterAddress.address,
    city: site.voterAddress.city,
    zip: site.voterAddress.zip,
  };
}

async function calculateSuggestedPollingLocations(): Promise<void> {
  const sites = await prisma.site.findMany({
    where: { deletedAt: null, voterAddress: { deletedAt: null } },
    select: {
      id: true,
      name: true,
      type: true,
      voterAddress: {
        select: {
          address: true,
          city: true,
          zip: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (!sites.some((site) => site.type === "EARLY_VOTING")) {
    console.warn(
      "[PollingLocationWorker] No active early-voting sites; early suggestions will be cleared.",
    );
  }
  if (!sites.some((site) => site.type === "DAY_OF_VOTING")) {
    console.warn(
      "[PollingLocationWorker] No active Election Day sites; Election Day suggestions will be cleared.",
    );
  }

  const sitesById = new Map(sites.map((site) => [site.id, site]));
  let cursor: string | undefined;
  let processed = 0;

  while (true) {
    const addresses = await prisma.voterAddress.findMany({
      where: { deletedAt: null, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: {
        id: true,
        address: true,
        normalizedAddress: true,
        city: true,
        zip: true,
        latitude: true,
        longitude: true,
        districtGroupId: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (addresses.length === 0) break;

    const updates = addresses.map((address) => ({
      id: address.id,
      earlyVotingSiteId:
        nearestSite(address, sites, "EARLY_VOTING")?.id ?? null,
      dayOfVotingSiteId:
        nearestSite(address, sites, "DAY_OF_VOTING")?.id ?? null,
    }));

    await prisma.$executeRaw`
      UPDATE "voter_addresses" AS voter_address
      SET
        "suggestedEarlyVotingSiteId" = suggestions.early_voting_site_id,
        "suggestedDayOfVotingSiteId" = suggestions.day_of_voting_site_id
      FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb)
        AS suggestions(id TEXT, early_voting_site_id TEXT, day_of_voting_site_id TEXT)
      WHERE voter_address.id = suggestions.id
    `;

    const indexDocuments: AddressIndexDocument[] = addresses.map(
      (address, index) => ({
        id: address.id,
        address: address.address,
        normalizedAddress: address.normalizedAddress,
        city: address.city ?? "",
        zip: address.zip ?? "",
        districtGroupId: address.districtGroupId,
        suggestedEarlyVotingSite: toSuggestedSite(
          sitesById.get(updates[index]?.earlyVotingSiteId ?? "") ?? null,
        ),
        suggestedDayOfVotingSite: toSuggestedSite(
          sitesById.get(updates[index]?.dayOfVotingSiteId ?? "") ?? null,
        ),
      }),
    );

    await upsertAddressDocuments(indexDocuments);
    processed += addresses.length;
    cursor = addresses[addresses.length - 1]?.id;
    console.log(
      `[PollingLocationWorker] Updated suggestions for ${processed} voter addresses.`,
    );
  }

  console.log(
    `[PollingLocationWorker] Calculation complete for ${processed} voter addresses.`,
  );
}

async function startWorker(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not defined");

  const boss = new PgBoss(connectionString);
  boss.on("error", (error) => {
    console.error("[PollingLocationWorker] pg-boss error:", error);
  });
  await boss.start();
  await boss.createQueue(POLLING_LOCATION_QUEUE);
  await boss.work(
    POLLING_LOCATION_QUEUE,
    { localConcurrency: 1 },
    async (jobs: Job[]) => {
      for (const job of jobs) {
        console.log(`[PollingLocationWorker] Starting job ${job.id}.`);
        await calculateSuggestedPollingLocations();
      }
    },
  );
  console.log("[PollingLocationWorker] Worker is running.");

  const shutdown = async () => {
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1]?.endsWith("pollingLocationWorker.ts")) {
  startWorker().catch((error) => {
    console.error("[PollingLocationWorker] Failed to start:", error);
    process.exit(1);
  });
}
