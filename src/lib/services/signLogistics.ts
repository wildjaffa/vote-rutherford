/**
 * Sign drop-off / pick-up planner.
 *
 * Crawl use case: given an election + early-voting vs election-day, derive
 * the two operational dates (day before / evening of) and assign matching
 * sites to volunteers available that day.
 *
 * Intentionally not stored on Site or Volunteer — those stay reusable.
 * Later use cases can call the generic VROOM client directly.
 */
import prisma from "../prisma";
import { SiteType } from "../../generated/prisma/enums";
import { makeError } from "./utils";
import {
  formatDuration,
  formatMiles,
  milesToMeters,
  optimizeRoutes,
  type VroomJob,
  type VroomVehicle,
  type VroomResult,
  type VroomRoute,
} from "./vroom";

export type VotingPeriod = "EARLY_VOTING" | "DAY_OF_VOTING";
export type SignTask = "DROP_OFF" | "PICK_UP";

/** Calendar keys match admin date inputs (UTC YYYY-MM-DD). */

export interface SignLogisticsSchedule {
  period: VotingPeriod;
  siteType: SiteType;
  /** Inclusive calendar start of the voting window (YYYY-MM-DD). */
  votingStartDate: string;
  /** Inclusive calendar end of the voting window (YYYY-MM-DD). */
  votingEndDate: string;
  /** Day before voting starts. */
  dropOffDate: string;
  /** Evening of the last voting day. */
  pickUpDate: string;
}

export interface VolunteerSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  displayName: string;
  startAddress: string;
  endAddress: string;
}

export interface SiteSummary {
  id: string;
  name: string;
  address: string;
}

export interface SignLogisticsPreview {
  election: { id: string; name: string };
  schedule: SignLogisticsSchedule;
  sites: SiteSummary[];
  dropOffVolunteers: VolunteerSummary[];
  pickUpVolunteers: VolunteerSummary[];
}

export interface RouteStop {
  type: "start" | "job" | "end";
  siteId?: string | undefined;
  siteName?: string | undefined;
  address?: string | undefined;
  distanceMeters?: number | undefined;
  durationSeconds?: number | undefined;
}

export interface VolunteerRoute {
  volunteer: VolunteerSummary;
  distanceMeters: number;
  durationSeconds: number;
  distanceLabel: string;
  durationLabel: string;
  stops: RouteStop[];
}

export interface SignRoutePlan {
  election: { id: string; name: string };
  period: VotingPeriod;
  task: SignTask;
  date: string;
  dateLabel: string;
  summary: {
    siteCount: number;
    volunteerCount: number;
    assignedSites: number;
    unassignedSites: number;
    unusedVolunteers: number;
    totalDistanceLabel: string;
    totalDurationLabel: string;
  };
  routes: VolunteerRoute[];
  unusedVolunteers: VolunteerSummary[];
  unassignedSites: SiteSummary[];
  notices: string[] | undefined;
}

interface ElectionDates {
  id: string;
  name: string;
  date: Date;
  earlyVotingStart: Date | null;
  earlyVotingEnd: Date | null;
}

export function volunteerDisplayName(v: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
  return name || v.email;
}

export function formatCalendarDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

export function toCalendarDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftCalendarDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year == null || month == null || day == null) return dateStr;
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function isVolunteerAvailableOn(
  volunteerDates: Date[],
  dateStr: string,
): boolean {
  if (volunteerDates.length === 0) return true;
  return volunteerDates.some((d) => toCalendarDateString(d) === dateStr);
}

export function getSignLogisticsSchedule(
  election: ElectionDates,
  period: VotingPeriod,
): SignLogisticsSchedule {
  if (period === "EARLY_VOTING") {
    if (!election.earlyVotingStart || !election.earlyVotingEnd) {
      throw makeError(
        "This election has no early voting dates. Add them on the election, or choose Election Day.",
        400,
      );
    }
    const votingStartDate = toCalendarDateString(election.earlyVotingStart);
    const votingEndDate = toCalendarDateString(election.earlyVotingEnd);
    return {
      period,
      siteType: SiteType.EARLY_VOTING,
      votingStartDate,
      votingEndDate,
      dropOffDate: shiftCalendarDate(votingStartDate, -1),
      pickUpDate: votingEndDate,
    };
  }

  const votingDate = toCalendarDateString(election.date);
  return {
    period,
    siteType: SiteType.DAY_OF_VOTING,
    votingStartDate: votingDate,
    votingEndDate: votingDate,
    dropOffDate: shiftCalendarDate(votingDate, -1),
    pickUpDate: votingDate,
  };
}

function taskDate(schedule: SignLogisticsSchedule, task: SignTask): string {
  return task === "DROP_OFF" ? schedule.dropOffDate : schedule.pickUpDate;
}

function toVolunteerSummary(v: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  startAddress: string;
  endAddress: string;
}): VolunteerSummary {
  return {
    id: v.id,
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    displayName: volunteerDisplayName(v),
    startAddress: v.startAddress,
    endAddress: v.endAddress,
  };
}

export async function loadSignLogisticsPreview(
  electionId: string,
  period: VotingPeriod,
): Promise<SignLogisticsPreview> {
  const election = await prisma.election.findFirst({
    where: { id: electionId, deletedAt: null },
    select: {
      id: true,
      name: true,
      date: true,
      earlyVotingStart: true,
      earlyVotingEnd: true,
    },
  });

  if (!election) {
    throw makeError("Election not found", 404);
  }

  const schedule = getSignLogisticsSchedule(election, period);

  const [sites, volunteers] = await Promise.all([
    prisma.site.findMany({
      where: { deletedAt: null, type: schedule.siteType },
      include: { voterAddress: true },
      orderBy: { name: "asc" },
    }),
    prisma.volunteer.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const siteSummaries: SiteSummary[] = sites.flatMap((site) => {
    if (!site.voterAddress) return [];
    return [
      {
        id: site.id,
        name: site.name,
        address: site.voterAddress.address,
      },
    ];
  });

  const dropOffVolunteers = volunteers
    .filter((v) =>
      isVolunteerAvailableOn(v.volunteerDates, schedule.dropOffDate),
    )
    .map(toVolunteerSummary);
  const pickUpVolunteers = volunteers
    .filter((v) =>
      isVolunteerAvailableOn(v.volunteerDates, schedule.pickUpDate),
    )
    .map(toVolunteerSummary);

  return {
    election: { id: election.id, name: election.name },
    schedule,
    sites: siteSummaries,
    dropOffVolunteers,
    pickUpVolunteers,
  };
}

export async function calculateSignRoutes(
  electionId: string,
  period: VotingPeriod,
  task: SignTask,
): Promise<SignRoutePlan> {
  const preview = await loadSignLogisticsPreview(electionId, period);
  const date = taskDate(preview.schedule, task);
  const volunteers =
    task === "DROP_OFF" ? preview.dropOffVolunteers : preview.pickUpVolunteers;

  if (preview.sites.length === 0) {
    const kind = period === "EARLY_VOTING" ? "early voting" : "election day";
    throw makeError(
      `No ${kind} sign sites to route. Add sites of that type first.`,
      400,
    );
  }

  if (volunteers.length === 0) {
    throw makeError(
      `No volunteers are available on ${formatCalendarDate(date)}. Add volunteer dates, or leave dates blank for any day.`,
      400,
    );
  }

  const sites = await prisma.site.findMany({
    where: {
      deletedAt: null,
      type: preview.schedule.siteType,
      id: { in: preview.sites.map((s) => s.id) },
    },
    include: { voterAddress: true },
  });
  const volunteerRows = await prisma.volunteer.findMany({
    where: { id: { in: volunteers.map((v) => v.id) }, deletedAt: null },
  });

  const siteByJobId = new Map<number, SiteSummary>();
  const jobs: VroomJob[] = [];
  for (const site of sites) {
    if (!site.voterAddress) continue;
    const jobId = jobs.length + 1;
    siteByJobId.set(jobId, {
      id: site.id,
      name: site.name,
      address: site.voterAddress.address,
    });
    jobs.push({
      id: jobId,
      location: [site.voterAddress.longitude, site.voterAddress.latitude],
      service: 300,
      description: site.name,
    });
  }

  const volunteerByVehicleId = new Map<
    number,
    (typeof volunteerRows)[number]
  >();
  // VROOM minimizes total travel time, which can legitimately put every site
  // on one route when volunteers have nearby or identical depots. Sign runs
  // need to share work, so cap every route at an even share of the sites.
  const maxTasksPerVolunteer = Math.ceil(jobs.length / volunteerRows.length);
  const vehicles: VroomVehicle[] = volunteerRows.map((volunteer, index) => {
    const vehicleId = index + 1;
    volunteerByVehicleId.set(vehicleId, volunteer);
    return {
      id: vehicleId,
      start: [volunteer.startLongitude, volunteer.startLatitude],
      end: [volunteer.endLongitude, volunteer.endLatitude],
      maxTasks: maxTasksPerVolunteer,
      ...(volunteer.maxDistance != null
        ? { maxDistanceMeters: milesToMeters(volunteer.maxDistance) }
        : {}),
      ...(volunteer.maxTime != null
        ? { maxTravelTimeSeconds: volunteer.maxTime * 60 }
        : {}),
    };
  });

  async function tryOptimizeWithNearbyFallback(
    vehiclesIn: VroomVehicle[],
    jobsIn: VroomJob[],
  ): Promise<{ result: VroomResult; notice: string | null }> {
    let successResult: VroomResult | null = null;
    let successNotice: string | null = null;
    // If a location needs a nearby routable approach point, every later
    // balancing request must use that same adjusted coordinate.
    let routedJobs = jobsIn;

    // Try initial optimize first
    try {
      successResult = await optimizeRoutes(vehiclesIn, jobsIn);
    } catch (err: unknown) {
      const maybeErr = err as { message?: unknown; details?: unknown };
      const msg =
        typeof maybeErr.message === "string" ? maybeErr.message : String(err);
      const details = maybeErr.details ?? err;
      const text = typeof details === "string" ? details : msg;

      const lower = String(text).toLowerCase();
      const lowerMsg = String(msg).toLowerCase();
      if (!lower.includes("unfound") && !lowerMsg.includes("unfound")) {
        throw err;
      }

      // Try to extract a coordinate from the error text (lon, lat or [lon, lat])
      const coordRe = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;
      const bracketRe = /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/;
      const find = String(text);
      const m1 = bracketRe.exec(find) ?? coordRe.exec(find);
      if (!m1) throw err;
      const lon = Number(m1[1]);
      const lat = Number(m1[2]);

      // Identify whether this coordinate matches a job (site) or a vehicle start/end
      let targetType: "job" | "vehicle_start" | "vehicle_end" | null = null;
      let targetId: number | null = null;
      const tol = 1e-5; // degrees
      // match jobs (try lon,lat and swapped lat,lon)
      for (const j of jobsIn) {
        const j0 = Number(j.location[0]);
        const j1 = Number(j.location[1]);
        if (Number.isFinite(j0) && Number.isFinite(j1)) {
          if (Math.abs(j0 - lon) < tol && Math.abs(j1 - lat) < tol) {
            targetType = "job";
            targetId = j.id;
            break;
          }
          if (Math.abs(j0 - lat) < tol && Math.abs(j1 - lon) < tol) {
            targetType = "job";
            targetId = j.id;
            break;
          }
        }
      }
      if (targetType == null) {
        for (const v of vehiclesIn) {
          const s0 = Number(v.start[0]);
          const s1 = Number(v.start[1]);
          const e0 = Number(v.end[0]);
          const e1 = Number(v.end[1]);
          if (Number.isFinite(s0) && Number.isFinite(s1)) {
            if (Math.abs(s0 - lon) < tol && Math.abs(s1 - lat) < tol) {
              targetType = "vehicle_start";
              targetId = v.id;
              break;
            }
            if (Math.abs(s0 - lat) < tol && Math.abs(s1 - lon) < tol) {
              targetType = "vehicle_start";
              targetId = v.id;
              break;
            }
          }
          if (Number.isFinite(e0) && Number.isFinite(e1)) {
            if (Math.abs(e0 - lon) < tol && Math.abs(e1 - lat) < tol) {
              targetType = "vehicle_end";
              targetId = v.id;
              break;
            }
            if (Math.abs(e0 - lat) < tol && Math.abs(e1 - lon) < tol) {
              targetType = "vehicle_end";
              targetId = v.id;
              break;
            }
          }
        }
      }

      if (!targetType || targetId == null) throw err;

      // helpers: meters -> lat/lon offset using spherical earth
      const R = 6371000; // meters
      function toRadians(deg: number) {
        return (deg * Math.PI) / 180;
      }
      function offsetPoint(
        lat0: number,
        lon0: number,
        distanceMeters: number,
        bearingDeg: number,
      ) {
        const dR = distanceMeters / R;
        const br = toRadians(bearingDeg);
        const lat1 = Math.asin(
          Math.sin(toRadians(lat0)) * Math.cos(dR) +
            Math.cos(toRadians(lat0)) * Math.sin(dR) * Math.cos(br),
        );
        const lon1 =
          toRadians(lon0) +
          Math.atan2(
            Math.sin(br) * Math.sin(dR) * Math.cos(toRadians(lat0)),
            Math.cos(dR) - Math.sin(toRadians(lat0)) * Math.sin(lat1),
          );
        return [
          Number(((lon1 * 180) / Math.PI).toFixed(8)),
          Number(((lat1 * 180) / Math.PI).toFixed(8)),
        ] as [number, number];
      }

      const distances = [25, 75];
      const bearings = [0, 45, 90, 135, 180, 225, 270, 315];

      for (const d of distances) {
        for (const b of bearings) {
          const vehiclesCopy = JSON.parse(
            JSON.stringify(vehiclesIn),
          ) as VroomVehicle[];
          const jobsCopy = JSON.parse(JSON.stringify(jobsIn)) as VroomJob[];

          if (targetType === "job") {
            for (const j of jobsCopy) {
              if (j.id === targetId) {
                j.location = offsetPoint(lat, lon, d, b);
                break;
              }
            }
          } else {
            for (const v of vehiclesCopy) {
              if (v.id === targetId) {
                if (targetType === "vehicle_start")
                  v.start = offsetPoint(lat, lon, d, b);
                if (targetType === "vehicle_end")
                  v.end = offsetPoint(lat, lon, d, b);
                break;
              }
            }
          }

          try {
            const good = await optimizeRoutes(vehiclesCopy, jobsCopy);
            // prepare notice text
            let name = "";
            if (targetType === "job") {
              const s = siteByJobId.get(targetId);
              name = s ? `site ${s.name}` : `site id ${targetId}`;
            } else {
              const vol = volunteerByVehicleId.get(targetId);
              name = vol
                ? `volunteer ${volunteerDisplayName(vol)}`
                : `vehicle id ${targetId}`;
            }
            const notice = `Routing adjusted: used nearby approach point for ${name} (offset ${d} m)`;
            successResult = good;
            successNotice = notice;
            routedJobs = jobsCopy;
            break;
          } catch {
            // continue trying
          }
        }
        if (successResult) break;
      }

      // nothing worked
      if (!successResult) {
        throw makeError(
          `Routing failed: no routable nearby approach points found for coordinate [${lon}, ${lat}]`,
          422,
        );
      }
    }

    // A successful result is already constrained with `max_tasks`, so do not
    // re-run a hand-rolled split. The old fallback could ignore its
    // per-volunteer quota and replace a complete result with partial routes
    // after swallowing an optimization error.
    if (successResult == null) {
      throw makeError("Routing failed", 502);
    }

    // VROOM's objective is total cost, not equal route duration. Starting
    // from the complete solution above, add progressively relaxed travel-time
    // caps and keep the first one that still assigns every site. This seeks
    // the tightest practical duration balance without hiding unassigned work
    // or weakening a volunteer's own maximum-time setting.
    const assignedJobIds = (result: VroomResult) => {
      const ids = new Set<number>();
      for (const route of result.routes) {
        for (const step of route.steps) {
          if (step.type === "job" && step.id != null) ids.add(step.id);
        }
      }
      return ids;
    };
    const isComplete = (result: VroomResult) =>
      result.unassigned.length === 0 &&
      assignedJobIds(result).size === routedJobs.length &&
      new Set(result.routes.map((route) => route.vehicle)).size ===
        vehiclesIn.length;

    if (
      vehiclesIn.length > 1 &&
      routedJobs.length >= vehiclesIn.length &&
      isComplete(successResult)
    ) {
      // VROOM reports driving duration and service time separately. Both are
      // included here so the balancing target reflects a volunteer's actual
      // time commitment; `max_travel_time` itself constrains driving time.
      const totalWorkSeconds = successResult.routes.reduce(
        (total, route) => total + (route.duration ?? 0) + (route.service ?? 0),
        0,
      );
      const averageWorkSeconds = totalWorkSeconds / vehiclesIn.length;
      const averageServiceSeconds =
        successResult.routes.reduce(
          (total, route) => total + (route.service ?? 0),
          0,
        ) / vehiclesIn.length;

      for (const tolerance of [0.05, 0.1, 0.15, 0.2, 0.3]) {
        const maxTravelTimeSeconds = Math.max(
          1,
          Math.ceil(
            averageWorkSeconds * (1 + tolerance) - averageServiceSeconds,
          ),
        );
        const durationLimitedVehicles = vehiclesIn.map((vehicle) => {
          // The initial solve uses max_tasks to guarantee every volunteer is
          // used. For duration balancing, that same cap prevents VROOM from
          // moving enough nearby stops off a long route. Drop it and rely on
          // the travel-time cap; isComplete below still rejects plans that do
          // not use every volunteer or assign every site.
          const { maxTasks: _maxTasks, ...vehicleWithoutTaskCap } = vehicle;
          void _maxTasks;
          return {
            ...vehicleWithoutTaskCap,
            maxTravelTimeSeconds:
              vehicle.maxTravelTimeSeconds == null
                ? maxTravelTimeSeconds
                : Math.min(vehicle.maxTravelTimeSeconds, maxTravelTimeSeconds),
          } as VroomVehicle;
        });

        try {
          const balanced = await optimizeRoutes(
            durationLimitedVehicles,
            routedJobs,
          );
          if (!isComplete(balanced)) continue;

          successResult = balanced;
          successNotice =
            (successNotice ? `${successNotice}; ` : "") +
            `Routes balanced to within ${Math.round(tolerance * 100)}% of average duration`;
          break;
        } catch {
          // This cap is infeasible; allow a little more variance and retry.
        }
      }
    }

    // A feasible max_travel_time only limits the longest route; VROOM still
    // minimizes total travel cost and has no objective for minimizing the gap
    // between volunteers. Explicitly test transfers from longer routes to
    // shorter ones, re-optimizing the two affected routes each time. This is
    // intentionally a small hill-climb: it uses road-network durations rather
    // than straight-line guesses and never accepts a move that worsens the
    // duration spread.
    const routeWorkSeconds = (route: VroomRoute) =>
      (route.duration ?? 0) + (route.service ?? 0);
    const routeJobIds = (route: VroomRoute) =>
      route.steps.flatMap((step) =>
        step.type === "job" && step.id != null ? [step.id] : [],
      );
    const durationRange = (routes: VroomRoute[]) => {
      const durations = routes.map(routeWorkSeconds);
      return Math.max(...durations) - Math.min(...durations);
    };
    const routeMatchesJobs = (result: VroomResult, jobIds: number[]) => {
      if (result.unassigned.length > 0 || result.routes.length !== 1) {
        return false;
      }
      const onlyRoute = result.routes[0];
      if (!onlyRoute) return false;
      const routedIds = routeJobIds(onlyRoute);
      return (
        routedIds.length === jobIds.length &&
        routedIds.every((jobId) => jobIds.includes(jobId))
      );
    };
    const withoutTaskCap = (vehicle: VroomVehicle): VroomVehicle => {
      const { maxTasks: _maxTasks, ...vehicleWithoutTaskCap } = vehicle;
      void _maxTasks;
      return vehicleWithoutTaskCap as VroomVehicle;
    };

    if (
      vehiclesIn.length > 1 &&
      routedJobs.length >= vehiclesIn.length &&
      isComplete(successResult)
    ) {
      let transferCount = 0;
      // A few targeted transfers are enough to escape the equal-stop-count
      // solution without making the planning request unreasonably slow.
      const maxTransfers = Math.min(routedJobs.length, 3);

      while (transferCount < maxTransfers) {
        if (!successResult || !successResult.routes) break;
        const currentRoutes: VroomRoute[] = successResult.routes;
        const currentRange = durationRange(currentRoutes);
        let bestRoutes: VroomRoute[] | null = null;
        let bestRange = currentRange;

        const sourceRoutes = [...currentRoutes].sort(
          (a, b) => routeWorkSeconds(b) - routeWorkSeconds(a),
        );
        const destinationRoutes = [...currentRoutes].sort(
          (a, b) => routeWorkSeconds(a) - routeWorkSeconds(b),
        );

        for (const sourceRoute of sourceRoutes) {
          const sourceJobIds = routeJobIds(sourceRoute);
          // Keep every volunteer in the final plan.
          if (sourceJobIds.length <= 1) continue;

          for (const destinationRoute of destinationRoutes) {
            if (destinationRoute.vehicle === sourceRoute.vehicle) continue;
            if (
              routeWorkSeconds(sourceRoute) <=
              routeWorkSeconds(destinationRoute)
            ) {
              continue;
            }

            const destinationJobIds = routeJobIds(destinationRoute);
            const sourceVehicle = vehiclesIn.find(
              (vehicle) => vehicle.id === sourceRoute.vehicle,
            );
            const destinationVehicle = vehiclesIn.find(
              (vehicle) => vehicle.id === destinationRoute.vehicle,
            );
            if (!sourceVehicle || !destinationVehicle) continue;

            for (const movedJobId of sourceJobIds) {
              const nextSourceJobIds = sourceJobIds.filter(
                (jobId) => jobId !== movedJobId,
              );
              const nextDestinationJobIds = [...destinationJobIds, movedJobId];
              const nextSourceJobs = routedJobs.filter((job) =>
                nextSourceJobIds.includes(job.id),
              );
              const nextDestinationJobs = routedJobs.filter((job) =>
                nextDestinationJobIds.includes(job.id),
              );

              try {
                const [sourceResult, destinationResult] = await Promise.all([
                  optimizeRoutes(
                    [withoutTaskCap(sourceVehicle)],
                    nextSourceJobs,
                  ),
                  optimizeRoutes(
                    [withoutTaskCap(destinationVehicle)],
                    nextDestinationJobs,
                  ),
                ]);
                if (
                  !routeMatchesJobs(sourceResult, nextSourceJobIds) ||
                  !routeMatchesJobs(destinationResult, nextDestinationJobIds)
                ) {
                  continue;
                }

                const candidateRoutes: VroomRoute[] = currentRoutes.map(
                  (route: VroomRoute) => {
                    if (route.vehicle === sourceRoute.vehicle) {
                      return sourceResult.routes[0] as VroomRoute;
                    }
                    if (route.vehicle === destinationRoute.vehicle) {
                      return destinationResult.routes[0] as VroomRoute;
                    }
                    return route;
                  },
                );
                const candidateRange = durationRange(candidateRoutes);
                if (candidateRange < bestRange) {
                  bestRange = candidateRange;
                  bestRoutes = candidateRoutes;
                }
              } catch {
                // A transfer that violates a volunteer constraint is not a
                // viable balancing move; evaluate the remaining candidates.
              }
            }
          }
        }

        if (!bestRoutes) break;
        successResult = { ...successResult, routes: bestRoutes };
        transferCount += 1;
      }

      if (transferCount > 0) {
        successNotice =
          (successNotice ? `${successNotice}; ` : "") +
          `Rebalanced ${transferCount} site${transferCount === 1 ? "" : "s"} to reduce route-duration variance`;
      }
    }

    return { result: successResult, notice: successNotice };
  }

  const { result, notice } = await tryOptimizeWithNearbyFallback(
    vehicles,
    jobs,
  );

  // diagnostic notices summarizing VROOM raw result to help debug assignment counts
  const noticesList: string[] = [];
  if (notice) noticesList.push(notice);
  try {
    const routeCount = (result.routes ?? []).length;
    const jobStepCount = (result.routes ?? []).reduce(
      (sum, r) => sum + (r.steps?.filter((s) => s.type === "job").length ?? 0),
      0,
    );
    const unassignedCount = (result.unassigned ?? []).length;
    noticesList.push(
      `VROOM: routes=${routeCount}, jobSteps=${jobStepCount}, unassigned=${unassignedCount}`,
    );
    // If counts don't line up or too few vehicles used, emit server log with details.
    const expectedAssigned = preview.sites.length - unassignedCount;
    if (jobStepCount !== expectedAssigned || routeCount < vehicles.length) {
      try {
        console.info("[signLogistics] VROOM diagnostic mismatch", {
          routeCount,
          jobStepCount,
          unassignedCount,
          expectedAssigned,
          vehicles: vehicles.map((v) => ({
            id: v.id,
            start: v.start,
            end: v.end,
          })),
          jobsCount: jobs.length,
        });

        const routeSummaries = (result.routes ?? []).map((r) => ({
          vehicle: r.vehicle,
          steps: (r.steps ?? []).map((s) => ({
            type: s.type,
            id: s.id,
            location: s.location,
          })),
          distance: r.distance,
        }));
        console.info(
          "[signLogistics] VROOM routes summary",
          JSON.stringify(routeSummaries),
        );
        console.info(
          "[signLogistics] jobId -> siteId map",
          Array.from(siteByJobId.entries()),
        );
        console.info(
          "[signLogistics] VROOM full result",
          JSON.stringify(result),
        );
        console.info("[signLogistics] jobs payload", JSON.stringify(jobs));
        console.info(
          "[signLogistics] unassigned details",
          JSON.stringify(result.unassigned ?? []),
        );
      } catch {
        // best-effort logging
      }
    }
  } catch {
    // swallow; diagnostics are best-effort
  }

  const assignedVolunteerIds = new Set<string>();
  const routes: VolunteerRoute[] = [];

  for (const route of result.routes) {
    const volunteer = volunteerByVehicleId.get(route.vehicle);
    if (!volunteer) continue;
    assignedVolunteerIds.add(volunteer.id);

    const stops: RouteStop[] = route.steps
      .filter(
        (step) =>
          step.type === "start" || step.type === "job" || step.type === "end",
      )
      .map((step) => {
        if (step.type === "job" && step.id != null) {
          const site = siteByJobId.get(step.id);
          return {
            type: "job" as const,
            siteId: site?.id,
            siteName: site?.name ?? step.description,
            address: site?.address,
            distanceMeters: step.distance,
            durationSeconds: step.duration,
          };
        }
        return {
          type: step.type as "start" | "end",
          address:
            step.type === "start"
              ? volunteer.startAddress
              : volunteer.endAddress,
          distanceMeters: step.distance,
          durationSeconds: step.duration,
        };
      });

    const distanceMeters = route.distance ?? 0;
    const durationSeconds = route.duration ?? 0;
    routes.push({
      volunteer: toVolunteerSummary(volunteer),
      distanceMeters,
      durationSeconds,
      distanceLabel: formatMiles(distanceMeters),
      durationLabel: formatDuration(durationSeconds),
      stops,
    });
  }

  const unusedVolunteers = volunteers.filter(
    (v) => !assignedVolunteerIds.has(v.id),
  );

  // Determine which job ids actually appear in route steps (some VROOM results
  // may report empty `unassigned` while not listing all jobs in route steps).
  const jobIdsSeen = new Set<number>();
  for (const route of result.routes ?? []) {
    for (const step of route.steps ?? []) {
      if (step.type === "job" && step.id != null) jobIdsSeen.add(step.id);
    }
  }

  const unassignedSites = Array.from(siteByJobId.entries())
    .filter(([jobId]) => !jobIdsSeen.has(jobId))
    .map(([, site]) => site);

  const totalDistance = routes.reduce((sum, r) => sum + r.distanceMeters, 0);
  const totalDuration = routes.reduce((sum, r) => sum + r.durationSeconds, 0);
  const assignedSites = jobIdsSeen.size;

  return {
    election: preview.election,
    period,
    task,
    date,
    dateLabel: formatCalendarDate(date),
    summary: {
      siteCount: preview.sites.length,
      volunteerCount: volunteers.length,
      assignedSites,
      unassignedSites: unassignedSites.length,
      unusedVolunteers: unusedVolunteers.length,
      totalDistanceLabel: formatMiles(totalDistance),
      totalDurationLabel: formatDuration(totalDuration),
    },
    routes,
    unusedVolunteers,
    unassignedSites,
    notices: noticesList.length ? noticesList : undefined,
  };
}
