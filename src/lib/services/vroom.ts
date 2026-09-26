/**
 * Generic VROOM client. Knows nothing about elections, volunteers, or signs —
 * just vehicles, jobs, and an optimized assignment.
 */
import { env } from "../utils/environment";
import { makeError } from "./utils";

export type LonLat = [number, number];

export type VroomVehicle = {
  id: number;
  start: LonLat;
  end: LonLat;
  /** Maximum number of stops VROOM may assign to this vehicle. */
  maxTasks?: number;
  maxDistanceMeters?: number;
  maxTravelTimeSeconds?: number;
};

export type VroomJob = {
  id: number;
  location: LonLat;
  service?: number;
  description?: string;
};

export type VroomStep = {
  type: "start" | "job" | "end" | "break" | string;
  id?: number;
  description?: string;
  arrival?: number;
  duration?: number;
  distance?: number;
  location?: LonLat;
};

export type VroomRoute = {
  vehicle: number;
  cost?: number;
  duration?: number;
  distance?: number;
  service?: number;
  steps: VroomStep[];
};

export type VroomUnassigned = {
  id: number;
  description?: string;
};

export type VroomResult = {
  code: number;
  error?: string | undefined;
  summary?:
    | {
        cost: number;
        routes: number;
        unassigned: number;
        duration?: number | undefined;
        distance?: number | undefined;
      }
    | undefined;
  routes: VroomRoute[];
  unassigned: VroomUnassigned[];
};

const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number): number {
  return Math.round(miles * METERS_PER_MILE);
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function formatMiles(meters: number): string {
  const miles = metersToMiles(meters);
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

function vroomUrl(): string {
  return env("VROOM_URL") || "http://localhost:3001";
}

export async function optimizeRoutes(
  vehicles: VroomVehicle[],
  jobs: VroomJob[],
): Promise<VroomResult> {
  if (vehicles.length === 0) {
    throw makeError(
      "At least one vehicle is required to calculate routes",
      400,
    );
  }
  if (jobs.length === 0) {
    throw makeError("At least one job is required to calculate routes", 400);
  }

  const payload = {
    vehicles: vehicles.map((v) => ({
      id: v.id,
      profile: "auto",
      start: v.start,
      end: v.end,
      ...(v.maxTasks != null ? { max_tasks: v.maxTasks } : {}),
      ...(v.maxDistanceMeters != null
        ? { max_distance: v.maxDistanceMeters }
        : {}),
      ...(v.maxTravelTimeSeconds != null
        ? { max_travel_time: v.maxTravelTimeSeconds }
        : {}),
    })),
    jobs: jobs.map((j) => ({
      id: j.id,
      location: j.location,
      service: j.service ?? 300,
      description: j.description,
    })),
  };

  let response: Response;
  try {
    try {
      console.info("[vroom] request payload", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    response = await fetch(vroomUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("VROOM connection failed:", err);
    throw makeError(
      "Routing engine is not available. Start Valhalla and VROOM with docker compose.",
      503,
    );
  }

  const body = (await response.json().catch(() => null)) as VroomResult | null;
  try {
    try {
      console.info("[vroom] response body", JSON.stringify(body));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    const details =
      typeof body === "object" && body
        ? (body.error ?? JSON.stringify(body))
        : response.statusText;
    throw makeError(`Routing engine error: ${details}`, 502, details);
  }

  if (!body || (body.code != null && body.code !== 0)) {
    throw makeError(
      body?.error || "Routing engine returned an error",
      502,
      body,
    );
  }

  return {
    code: body.code,
    summary: body.summary,
    routes: body.routes ?? [],
    unassigned: body.unassigned ?? [],
  };
}
