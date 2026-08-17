import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import prisma from "../lib/prisma";
import { geocodeAddress } from "../lib/services/geocoding";
import { normalizeAddress } from "../lib/utils/addressNormalizer";
import { handleActionError } from "./utils";

const optionalString = z.preprocess(
  (val) => (typeof val === "string" && val.trim() ? val.trim() : undefined),
  z.string().optional(),
);

const optionalNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

interface ResolvedCoords {
  address: string;
  latitude: number;
  longitude: number;
}

type ResolvedVoterAddress = ResolvedCoords & {
  id: string;
};

/**
 * Resolve lat/lng for a volunteer start/end point.
 * Prefer Meili/Postgres voterAddressId, then client coords, then Nominatim.
 */
async function resolveCoordinates(opts: {
  voterAddressId?: string | undefined;
  address: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): Promise<ResolvedCoords> {
  if (opts.voterAddressId) {
    const existing = await prisma.voterAddress.findFirst({
      where: { id: opts.voterAddressId, deletedAt: null },
    });
    if (existing) {
      return {
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
      };
    }
  }

  if (opts.latitude != null && opts.longitude != null) {
    return {
      address: opts.address,
      latitude: opts.latitude,
      longitude: opts.longitude,
    };
  }

  const normalized = normalizeAddress(opts.address);
  if (normalized) {
    const byNormalized = await prisma.voterAddress.findFirst({
      where: { normalizedAddress: normalized, deletedAt: null },
    });
    if (byNormalized) {
      return {
        address: byNormalized.address,
        latitude: byNormalized.latitude,
        longitude: byNormalized.longitude,
      };
    }
  }

  const geocoded = await geocodeAddress(opts.address);
  if (!geocoded) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: `Could not resolve coordinates for address: ${opts.address}`,
    });
  }

  return {
    address: opts.address,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}

/**
 * Resolve or create a VoterAddress for site linking.
 * Prefer explicit voterAddressId from autocomplete selection.
 */
async function resolveOrCreateVoterAddress(opts: {
  voterAddressId?: string | undefined;
  address: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): Promise<ResolvedVoterAddress> {
  if (opts.voterAddressId) {
    const existing = await prisma.voterAddress.findFirst({
      where: { id: opts.voterAddressId, deletedAt: null },
    });
    if (existing) {
      return {
        id: existing.id,
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
      };
    }
  }

  const normalized = normalizeAddress(opts.address);
  if (normalized) {
    const byNormalized = await prisma.voterAddress.findFirst({
      where: { normalizedAddress: normalized, deletedAt: null },
    });
    if (byNormalized) {
      return {
        id: byNormalized.id,
        address: byNormalized.address,
        latitude: byNormalized.latitude,
        longitude: byNormalized.longitude,
      };
    }
  }

  let lat = opts.latitude;
  let lon = opts.longitude;

  if (lat == null || lon == null) {
    const geocoded = await geocodeAddress(opts.address);
    if (!geocoded) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: `Could not resolve coordinates for address: ${opts.address}`,
      });
    }
    lat = geocoded.latitude;
    lon = geocoded.longitude;
  }

  const created = await prisma.voterAddress.create({
    data: {
      address: opts.address,
      normalizedAddress: normalized || opts.address.toUpperCase().trim(),
      latitude: lat,
      longitude: lon,
    },
  });

  return {
    id: created.id,
    address: created.address,
    latitude: created.latitude,
    longitude: created.longitude,
  };
}

function parseVolunteerDates(volunteerDates?: string): Date[] {
  if (!volunteerDates) return [];
  return volunteerDates
    .split(",")
    .map((d) => new Date(d.trim()))
    .filter((d) => !isNaN(d.getTime()));
}

export const createSite = defineAction({
  accept: "form",
  input: z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["EARLY_VOTING", "DAY_OF_VOTING"]),
    address: z.string().min(1, "Address is required"),
    voterAddressId: optionalString,
    latitude: optionalNumber,
    longitude: optionalNumber,
  }),
  handler: async (input) => {
    try {
      const voterAddress = await resolveOrCreateVoterAddress({
        voterAddressId: input.voterAddressId,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      const site = await prisma.site.create({
        data: {
          name: input.name,
          type: input.type,
          voterAddressId: voterAddress.id,
        },
      });

      return { success: true, site };
    } catch (err) {
      handleActionError(err, "Failed to create site");
    }
  },
});

export const updateSite = defineAction({
  accept: "form",
  input: z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required"),
    type: z.enum(["EARLY_VOTING", "DAY_OF_VOTING"]),
    address: z.string().min(1, "Address is required"),
    voterAddressId: optionalString,
    latitude: optionalNumber,
    longitude: optionalNumber,
  }),
  handler: async (input) => {
    try {
      const voterAddress = await resolveOrCreateVoterAddress({
        voterAddressId: input.voterAddressId,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      const site = await prisma.site.update({
        where: { id: input.id },
        data: {
          name: input.name,
          type: input.type,
          voterAddressId: voterAddress.id,
        },
      });

      return { success: true, site };
    } catch (err) {
      handleActionError(err, "Failed to update site");
    }
  },
});

export const deleteSite = defineAction({
  accept: "json",
  input: z.object({ id: z.string() }),
  handler: async (input) => {
    try {
      await prisma.site.delete({ where: { id: input.id } });
      return { success: true };
    } catch (err) {
      handleActionError(err, "Failed to delete site");
    }
  },
});

export const createVolunteer = defineAction({
  accept: "form",
  input: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.email("Valid email is required"),
    volunteerDates: z.string().optional(),
    startAddress: z.string().min(1, "Start address is required"),
    startVoterAddressId: optionalString,
    startLatitude: optionalNumber,
    startLongitude: optionalNumber,
    endAddress: z.string().min(1, "End address is required"),
    endVoterAddressId: optionalString,
    endLatitude: optionalNumber,
    endLongitude: optionalNumber,
    maxDistance: optionalNumber,
    maxTime: optionalNumber,
  }),
  handler: async (input) => {
    try {
      const start = await resolveCoordinates({
        voterAddressId: input.startVoterAddressId,
        address: input.startAddress,
        latitude: input.startLatitude,
        longitude: input.startLongitude,
      });
      const end = await resolveCoordinates({
        voterAddressId: input.endVoterAddressId,
        address: input.endAddress,
        latitude: input.endLatitude,
        longitude: input.endLongitude,
      });

      const volunteer = await prisma.volunteer.create({
        data: {
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          email: input.email,
          volunteerDates: parseVolunteerDates(input.volunteerDates),
          startAddress: start.address,
          startLatitude: start.latitude,
          startLongitude: start.longitude,
          endAddress: end.address,
          endLatitude: end.latitude,
          endLongitude: end.longitude,
          maxDistance: input.maxDistance || null,
          maxTime: input.maxTime || null,
        },
      });

      return { success: true, volunteer };
    } catch (err) {
      handleActionError(err, "Failed to create volunteer");
    }
  },
});

export const updateVolunteer = defineAction({
  accept: "form",
  input: z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.email("Valid email is required"),
    volunteerDates: z.string().optional(),
    startAddress: z.string().min(1, "Start address is required"),
    startVoterAddressId: optionalString,
    startLatitude: optionalNumber,
    startLongitude: optionalNumber,
    endAddress: z.string().min(1, "End address is required"),
    endVoterAddressId: optionalString,
    endLatitude: optionalNumber,
    endLongitude: optionalNumber,
    maxDistance: optionalNumber,
    maxTime: optionalNumber,
  }),
  handler: async (input) => {
    try {
      const start = await resolveCoordinates({
        voterAddressId: input.startVoterAddressId,
        address: input.startAddress,
        latitude: input.startLatitude,
        longitude: input.startLongitude,
      });
      const end = await resolveCoordinates({
        voterAddressId: input.endVoterAddressId,
        address: input.endAddress,
        latitude: input.endLatitude,
        longitude: input.endLongitude,
      });

      const volunteer = await prisma.volunteer.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          email: input.email,
          volunteerDates: parseVolunteerDates(input.volunteerDates),
          startAddress: start.address,
          startLatitude: start.latitude,
          startLongitude: start.longitude,
          endAddress: end.address,
          endLatitude: end.latitude,
          endLongitude: end.longitude,
          maxDistance: input.maxDistance || null,
          maxTime: input.maxTime || null,
        },
      });

      return { success: true, volunteer };
    } catch (err) {
      handleActionError(err, "Failed to update volunteer");
    }
  },
});

export const deleteVolunteer = defineAction({
  accept: "json",
  input: z.object({ id: z.string() }),
  handler: async (input) => {
    try {
      await prisma.volunteer.delete({ where: { id: input.id } });
      return { success: true };
    } catch (err) {
      handleActionError(err, "Failed to delete volunteer");
    }
  },
});
