import prisma, { withUserContext } from "../prisma";
import type { Race, Prisma } from "../../generated/prisma/client";
import type { UpsertRaceType } from "../models/upsertRace";
import { UpsertRace } from "../models/upsertRace";
import { canManageRace } from "../permissions";
import { makeError } from "./utils";

export async function validateRacePayload(
  body: unknown,
): Promise<UpsertRaceType> {
  const validator = new UpsertRace();
  const validation = validator.validate(body);
  if (!validation.success || !validation.data) {
    throw makeError("Validation failed", undefined, validation.errors);
  }
  return validation.data;
}

export async function createRace(
  data: UpsertRaceType,
  userId: string,
): Promise<Race> {
  const validated = await validateRacePayload(data);

  if (!validated.electionId) {
    throw makeError("Missing electionId", 400);
  }

  const hasPermission = await canManageRace(validated.electionId);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const election = await prisma.election.findUnique({
    where: { id: validated.electionId },
  });
  if (!election) {
    throw makeError("Election not found", 404);
  }

  const { policyQuestionIds, ...raceData } = validated;

  const created = await withUserContext(userId, () =>
    prisma.race.create({
      data: {
        ...(raceData as Prisma.RaceUncheckedCreateInput),
        policyQuestionsToRaces: {
          create: (policyQuestionIds || []).map((id) => ({
            policyQuestionId: id,
          })),
        },
      },
    }),
  );
  return created;
}

export async function updateRace(
  id: string,
  body: UpsertRaceType,
  userId: string,
): Promise<Race> {
  const hasPermission = await canManageRace(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const existing = await prisma.race.findUnique({ where: { id } });
  if (!existing) {
    throw makeError("Race not found", 404);
  }

  const validated = await validateRacePayload(body);
  const { policyQuestionIds, ...raceData } = validated;

  const updated = await withUserContext(userId, async () => {
    const race = await prisma.race.update({
      where: { id },
      data: raceData as Prisma.RaceUpdateInput,
    });

    if (policyQuestionIds !== undefined) {
      // Simple sync: delete all and recreate
      await prisma.policyQuestionToRace.deleteMany({
        where: { raceId: id },
      });

      if (policyQuestionIds.length > 0) {
        await prisma.policyQuestionToRace.createMany({
          data: policyQuestionIds.map((pqId) => ({
            raceId: id,
            policyQuestionId: pqId,
          })),
        });
      }
    }

    return race;
  });
  return updated;
}

export async function deleteRace(id: string, userId: string): Promise<Race> {
  const hasPermission = await canManageRace(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const deleted = await withUserContext(userId, () =>
    prisma.race.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );
  return deleted;
}
