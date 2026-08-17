import prisma, { withUserContext } from "../prisma";
import type { Race, Prisma } from "../../generated/prisma/client";
import type { UpsertRaceType } from "../models/upsertRace";
import { UpsertRace } from "../models/upsertRace";
import { canManageRace } from "../permissions";
import { makeError } from "./utils";
import { purgeCloudflareCache } from "./cloudflare";

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

  const {
    policyQuestionIds,
    sourceRaceIds,
    copyPolicyQuestionsFromSources,
    promoteWinningCandidatesFromSources,
    ...raceData
  } = validated;

  const createData: Prisma.RaceUncheckedCreateInput = {
    ...(raceData as Prisma.RaceUncheckedCreateInput),
    policyQuestionsToRaces: {
      create: (policyQuestionIds || []).map((id) => ({
        policyQuestionId: id,
      })),
    },
  };
  if (sourceRaceIds !== undefined) {
    createData.sourceRaces = {
      connect: sourceRaceIds.map((id) => ({ id })),
    };
  }

  const created = await withUserContext(userId, () =>
    prisma.race.create({
      data: createData,
    }),
  );

  if (copyPolicyQuestionsFromSources && sourceRaceIds?.length) {
    await withUserContext(userId, async () => {
      const sourceRaces = await prisma.race.findMany({
        where: { id: { in: sourceRaceIds }, deletedAt: null },
        include: { policyQuestionsToRaces: { where: { deletedAt: null }, include: { policyQuestion: true } } },
      });
      const existingQuestions = await prisma.policyQuestion.findMany({
        where: { electionId: created.electionId, deletedAt: null },
      });
      const questionIdsByContent = new Map(existingQuestions.map((question) => [
        `${question.questionText}\u0000${question.descriptionText}`, question.id,
      ]));
      const questionIds = new Set<string>();
      for (const sourceRace of sourceRaces) {
        for (const { policyQuestion } of sourceRace.policyQuestionsToRaces) {
          const key = `${policyQuestion.questionText}\u0000${policyQuestion.descriptionText}`;
          let questionId = questionIdsByContent.get(key);
          if (!questionId) {
            const copied = await prisma.policyQuestion.create({ data: {
              electionId: created.electionId,
              questionText: policyQuestion.questionText,
              descriptionText: policyQuestion.descriptionText,
              order: policyQuestion.order,
            }});
            questionId = copied.id;
            questionIdsByContent.set(key, questionId);
          }
          questionIds.add(questionId);
        }
      }
      if (questionIds.size) {
        await prisma.policyQuestionToRace.createMany({
          data: [...questionIds].map((policyQuestionId) => ({
            raceId: created.id, policyQuestionId,
          })),
        });
      }
    });
  }

  if (promoteWinningCandidatesFromSources && sourceRaceIds?.length) {
    const winners = await prisma.candidate.findMany({
      where: {
        raceId: { in: sourceRaceIds },
        isWinner: true,
        deletedAt: null,
      },
    });
    const { promoteCandidate } = await import("./candidates");
    for (const winner of winners) {
      await promoteCandidate(winner.id, created.id, userId);
    }
  }

  void purgeCloudflareCache([
    `/elections/${election.slug}`,
    `/elections/${election.slug}/${created.slug}`,
  ]);

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

  const existing = await prisma.race.findUnique({
    where: { id },
    include: { election: true },
  });
  if (!existing) {
    throw makeError("Race not found", 404);
  }

  const validated = await validateRacePayload(body);
  const { policyQuestionIds, sourceRaceIds, copyPolicyQuestionsFromSources, promoteWinningCandidatesFromSources, ...raceData } = validated;

  const updated = await withUserContext(userId, async () => {
    const updateData: Prisma.RaceUpdateInput = {
      ...(raceData as Prisma.RaceUpdateInput),
    };

    if (sourceRaceIds !== undefined) {
      updateData.sourceRaces = {
        set: sourceRaceIds.map((id) => ({ id })),
      };
    }

    const race = await prisma.race.update({
      where: { id },
      data: updateData,
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

    if (copyPolicyQuestionsFromSources && sourceRaceIds?.length) {
      const sourceRaces = await prisma.race.findMany({
        where: { id: { in: sourceRaceIds }, deletedAt: null },
        include: { policyQuestionsToRaces: { where: { deletedAt: null }, include: { policyQuestion: true } } },
      });
      const existingQuestions = await prisma.policyQuestion.findMany({
        where: { electionId: race.electionId, deletedAt: null },
      });
      const questionIdsByContent = new Map(existingQuestions.map((question) => [
        `${question.questionText}\u0000${question.descriptionText}`, question.id,
      ]));
      const questionIds = new Set<string>();
      for (const sourceRace of sourceRaces) {
        for (const { policyQuestion } of sourceRace.policyQuestionsToRaces) {
          const key = `${policyQuestion.questionText}\u0000${policyQuestion.descriptionText}`;
          let questionId = questionIdsByContent.get(key);
          if (!questionId) {
            const copied = await prisma.policyQuestion.create({ data: {
              electionId: race.electionId,
              questionText: policyQuestion.questionText,
              descriptionText: policyQuestion.descriptionText,
              order: policyQuestion.order,
            }});
            questionId = copied.id;
            questionIdsByContent.set(key, questionId);
          }
          questionIds.add(questionId);
        }
      }
      if (questionIds.size) {
        // Find existing links for this race to avoid duplication
        const existingLinks = await prisma.policyQuestionToRace.findMany({
          where: { raceId: race.id },
        });
        const existingLinkedQuestionIds = new Set(existingLinks.map(l => l.policyQuestionId));
        const newQuestionIdsToLink = [...questionIds].filter(id => !existingLinkedQuestionIds.has(id));
        
        if (newQuestionIdsToLink.length > 0) {
          await prisma.policyQuestionToRace.createMany({
            data: newQuestionIdsToLink.map((policyQuestionId) => ({
              raceId: race.id, policyQuestionId,
            })),
          });
        }
      }
    }

    if (promoteWinningCandidatesFromSources && sourceRaceIds?.length) {
      const winners = await prisma.candidate.findMany({
        where: {
          raceId: { in: sourceRaceIds },
          isWinner: true,
          deletedAt: null,
        },
      });
      const { promoteCandidate } = await import("./candidates");
      for (const winner of winners) {
        // Avoid duplicate promotions if candidate already promoted into this race
        const existingPromoted = await prisma.candidate.findFirst({
          where: {
            raceId: race.id,
            historicalLinkId: winner.id,
            deletedAt: null,
          },
        });
        if (!existingPromoted) {
          await promoteCandidate(winner.id, race.id, userId);
        }
      }
    }

    return race;
  });

  const endpointsToPurge = [
    `/elections/${existing.election.slug}`,
    `/elections/${existing.election.slug}/${existing.slug}`,
  ];
  if (updated.slug !== existing.slug) {
    endpointsToPurge.push(`/elections/${existing.election.slug}/${updated.slug}`);
  }
  void purgeCloudflareCache(endpointsToPurge);

  return updated;
}

export async function reorderRaces(
  electionId: string,
  updates: { id: string; order: number }[],
  userId: string,
): Promise<void> {
  const hasPermission = await canManageRace(electionId);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  await withUserContext(userId, async () => {
    for (const update of updates) {
      await prisma.race.update({
        where: { id: update.id },
        data: { order: update.order },
      });
    }
  });

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (election) {
    void purgeCloudflareCache([
      `/elections/${election.slug}`,
    ]);
  }
}

export async function deleteRace(id: string, userId: string): Promise<Race> {
  const hasPermission = await canManageRace(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const existing = await prisma.race.findUnique({
    where: { id },
    include: { election: true },
  });

  const deleted = await withUserContext(userId, () =>
    prisma.race.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );

  if (existing) {
    void purgeCloudflareCache([
      `/elections/${existing.election.slug}`,
      `/elections/${existing.election.slug}/${existing.slug}`,
    ]);
  }

  return deleted;
}
