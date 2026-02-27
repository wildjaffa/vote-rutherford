import prisma, { withUserContext } from "../prisma";
import type { Election, Prisma } from "../../generated/prisma/client";
import type { UpsertElectionType } from "../models/upsertElection";
import { UpsertElection } from "../models/upsertElection";
import { canManageElections, canManageElection } from "../permissions";
import { makeError } from "./utils";

export async function validateElectionPayload(
  body: unknown,
): Promise<UpsertElectionType> {
  const validator = new UpsertElection();
  const validation = validator.validate(body);
  if (!validation.success || !validation.data) {
    throw makeError("Validation failed", undefined, validation.errors);
  }
  return validation.data;
}

export async function createElection(
  payload: UpsertElectionType,
  userId: string,
): Promise<Election> {
  const hasPermission = await canManageElections();
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const validated = await validateElectionPayload(payload);

  const { policyQuestions, ...electionData } = validated;
  const election = await withUserContext(userId, () =>
    prisma.election.create({
      data: {
        ...(electionData as Prisma.ElectionCreateInput),
        policyQuestions: {
          create: (policyQuestions || []).map((q) => ({
            questionText: q.questionText,
            descriptionText: q.descriptionText || "",
            order: q.order,
          })),
        },
      },
    }),
  );
  return election;
}

export async function updateElection(
  id: string,
  payload: UpsertElectionType,
  userId: string,
): Promise<Election | null> {
  const hasPermission = await canManageElection(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const existing = await prisma.election.findUnique({ where: { id } });
  if (!existing) {
    throw makeError("Election not found", 404);
  }

  const validated = await validateElectionPayload(payload);
  // pulling id out so we don't try to update it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { policyQuestions, id: electionId, ...electionData } = validated;

  let updated: Election | null = null;

  await withUserContext(userId, async () => {
    // 1. Update basic election data
    try {
      updated = await prisma.election.update({
        where: { id: id },
        data: {
          ...electionData,
          earlyVotingStart: electionData.earlyVotingStart ?? null,
          earlyVotingEnd: electionData.earlyVotingEnd ?? null,
          headerImageId: null,
        },
      });
    } catch (error) {
      console.error("Failed to update election", error);
      throw makeError("Failed to update election", 500, error);
    }

    // 2. Sync Policy Questions
    if (policyQuestions !== undefined) {
      const existingQuestions = await prisma.policyQuestion.findMany({
        where: { electionId: id },
      });

      // Questions to delete
      const questionsToDelete = existingQuestions.filter(
        (existing) => !policyQuestions.some((q) => q.id === existing.id),
      );
      if (questionsToDelete.length > 0) {
        await prisma.policyQuestion.deleteMany({
          where: { id: { in: questionsToDelete.map((q) => q.id) } },
        });
      }

      // Create or update questions
      for (const q of policyQuestions) {
        if (q.id) {
          await prisma.policyQuestion.update({
            where: { id: q.id },
            data: {
              questionText: q.questionText,
              descriptionText: q.descriptionText || "",
              order: q.order,
            },
          });
        } else {
          await prisma.policyQuestion.create({
            data: {
              electionId: id,
              questionText: q.questionText,
              descriptionText: q.descriptionText || "",
              order: q.order,
            },
          });
        }
      }
    }
  });
  return updated;
}

export async function deleteElection(
  id: string,
  userId: string,
): Promise<Election> {
  const hasPermission = await canManageElection(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const deleted = await withUserContext(userId, () =>
    prisma.election.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );
  return deleted;
}

export async function getUpcomingElections(): Promise<Election[]> {
  const now = new Date();
  return await prisma.election.findMany({
    where: {
      date: {
        gte: now,
      },
      deletedAt: null,
    },
    orderBy: {
      date: "asc",
    },
  });
}
