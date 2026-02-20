import prisma, { withUserContext } from "../prisma";
import type { Candidate, Prisma } from "../../generated/prisma/client";
import { UpsertCandidate } from "../models/upsertCandidate";
import type { UpsertCandidateType } from "../models/upsertCandidate";
import { canManageCandidate, canManageRace } from "../permissions";
import { makeError } from "./utils";

// constant copied from API code – could eventually be resolved from context
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function validateCandidatePayload(
  body: unknown,
): Promise<UpsertCandidateType> {
  const validator = new UpsertCandidate();
  const validation = validator.validate(body);
  if (!validation.success || !validation.data) {
    throw makeError("Validation failed", undefined, validation.errors);
  }
  return validation.data;
}

export async function createCandidate(
  data: UpsertCandidateType,
): Promise<Candidate> {
  // perform validation and permission check as in original API
  const validated = await validateCandidatePayload(data);

  // ensure race exists and user can manage it
  if (!validated.raceId) {
    throw makeError("Missing raceId", 400);
  }

  const hasPermission = await canManageRace(validated.raceId);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const race = await prisma.race.findUnique({
    where: { id: validated.raceId },
  });
  if (!race) {
    throw makeError("Race not found", 404);
  }

  // create candidate with audit context
  const candidate = await withUserContext(SYSTEM_USER_ID, async () => {
    const { externalLinks, policyResponses, ...candidateData } = validated;
    // validated already contains raceId; Prisma create accepts it directly
    const newCandidate = await prisma.candidate.create({
      data: {
        ...(candidateData as any),
        externalLinks: undefined,
      } as Prisma.CandidateUncheckedCreateInput,
    });

    if (externalLinks && externalLinks.length > 0) {
      const types = await prisma.externalLinkType.findMany({
        where: { value: { in: externalLinks.map((l) => l.type) } },
      });

      for (const link of externalLinks) {
        const linkType = types.find((t) => t.value === link.type);
        if (!linkType) continue;

        await prisma.candidateExternalLink.create({
          data: {
            candidate_id: newCandidate.id,
            hyperlink: link.url,
            displayText: link.displayText || null,
            externalLinkTypeId: linkType.id,
          },
        });
      }
    }

    if (policyResponses && policyResponses.length > 0) {
      for (const response of policyResponses) {
        const createdResponse = await prisma.candidatePolicyResponse.create({
          data: {
            candidateId: newCandidate.id,
            policyQuestionId: response.questionId,
            response: response.responseText,
            requestSentAt: new Date(),
          },
        });

        if (response.clarifications && response.clarifications.length > 0) {
          for (const clarification of response.clarifications) {
            await prisma.candidatePolicyResponseClarification.create({
              data: {
                candidatePolicyResponseId: createdResponse.id,
                clarification: clarification.clarificationText,
              },
            });
          }
        }
      }
    }

    return newCandidate;
  });
  return candidate;
}

export async function updateCandidate(
  id: string,
  body: UpsertCandidateType,
): Promise<Candidate> {
  const hasPermission = await canManageCandidate(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  const existingCandidate = await prisma.candidate.findUnique({
    where: { id },
  });
  if (!existingCandidate) {
    throw makeError("Candidate not found", 404);
  }

  const validationData = await validateCandidatePayload(body);

  const {
    firstName,
    middleName,
    lastName,
    partyAffiliation,
    birthYear,
    biography,
    biographyRedacted,
    profileImageId,
    externalLinks,
    policyResponses,
  } = validationData;

  const updated = await withUserContext(SYSTEM_USER_ID, async () => {
    const data: Prisma.CandidateUncheckedUpdateInput = {
      ...(firstName && { firstName }),
      ...(middleName !== undefined && { middleName: middleName || null }),
      ...(lastName && { lastName }),
      ...(partyAffiliation && { partyAffiliation }),
      ...(birthYear !== undefined && { birthYear: birthYear || null }),
      ...(biography !== undefined && { biography: biography || null }),
      ...(biographyRedacted !== undefined && {
        biographyRedacted: biographyRedacted || null,
      }),
      updatedAt: new Date(),
    };

    if (profileImageId !== undefined) {
      if (profileImageId) {
        const blob = await prisma.blobStorageReference.findUnique({
          where: { id: profileImageId },
        });
        if (!blob) throw new Error("profileImageId not found");
      }

      if (
        existingCandidate.profileImageId &&
        existingCandidate.profileImageId !== profileImageId
      ) {
        const oldBlobId = existingCandidate.profileImageId;
        // use blob service helper to soft-delete and remove object
        try {
          const { deleteBlob } = await import("./blobs");
          await deleteBlob(oldBlobId);
        } catch (err) {
          console.error("Failed to delete old blob via service:", err);
        }
      }

      data.profileImageId = profileImageId || null;
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data,
    });

    if (externalLinks !== undefined) {
      const existingLinks = await prisma.candidateExternalLink.findMany({
        where: { candidate_id: id },
      });

      // Links to delete
      const linksToDelete = existingLinks.filter(
        (existing) => !externalLinks.some((l) => l.id === existing.id),
      );
      if (linksToDelete.length > 0) {
        await prisma.candidateExternalLink.deleteMany({
          where: { id: { in: linksToDelete.map((l) => l.id) } },
        });
      }

      // Sync links
      if (externalLinks.length > 0) {
        const types = await prisma.externalLinkType.findMany({
          where: { value: { in: externalLinks.map((l) => l.type) } },
        });

        for (const link of externalLinks) {
          const linkType = types.find((t) => t.value === link.type);
          if (!linkType) continue;

          if (link.id) {
            // Update
            await prisma.candidateExternalLink.update({
              where: { id: link.id },
              data: {
                hyperlink: link.url,
                displayText: link.displayText || null,
                externalLinkTypeId: linkType.id,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create
            await prisma.candidateExternalLink.create({
              data: {
                candidate_id: id,
                hyperlink: link.url,
                displayText: link.displayText || null,
                externalLinkTypeId: linkType.id,
              },
            });
          }
        }
      }
    }

    if (policyResponses !== undefined) {
      const existingResponses = await prisma.candidatePolicyResponse.findMany({
        where: { candidateId: id },
        include: { clarifications: true },
      });

      const processedResponseIds = new Set<string>();

      for (const response of policyResponses) {
        let targetResponseId: string | undefined = response.id;

        // Try to matching existing response by questionId if no id provided
        if (!targetResponseId) {
          const matching = existingResponses.find(
            (er) => er.policyQuestionId === response.questionId,
          );
          if (matching) targetResponseId = matching.id;
        }

        if (targetResponseId) {
          // Update
          await prisma.candidatePolicyResponse.update({
            where: { id: targetResponseId },
            data: {
              response: response.responseText,
              updatedAt: new Date(),
            },
          });
          processedResponseIds.add(targetResponseId);
        } else {
          // Create
          const created = await prisma.candidatePolicyResponse.create({
            data: {
              candidateId: id,
              policyQuestionId: response.questionId,
              response: response.responseText,
              requestSentAt: new Date(),
            },
          });
          targetResponseId = created.id;
        }

        // Sync Clarifications
        if (response.clarifications !== undefined) {
          const existingClarifications =
            existingResponses.find((er) => er.id === targetResponseId)
              ?.clarifications || [];

          const processedClarificationIds = new Set<string>();

          for (const clarification of response.clarifications) {
            if (clarification.id) {
              await prisma.candidatePolicyResponseClarification.update({
                where: { id: clarification.id },
                data: {
                  clarification: clarification.clarificationText,
                  updatedAt: new Date(),
                },
              });
              processedClarificationIds.add(clarification.id);
            } else {
              await prisma.candidatePolicyResponseClarification.create({
                data: {
                  candidatePolicyResponseId: targetResponseId!,
                  clarification: clarification.clarificationText,
                },
              });
            }
          }

          // Delete other clarifications
          const clarificationsToDelete = existingClarifications.filter(
            (ec) => !processedClarificationIds.has(ec.id),
          );
          if (clarificationsToDelete.length > 0) {
            await prisma.candidatePolicyResponseClarification.deleteMany({
              where: { id: { in: clarificationsToDelete.map((c) => c.id) } },
            });
          }
        }
      }

      // Delete other responses
      const responsesToDelete = existingResponses.filter(
        (er) => !processedResponseIds.has(er.id),
      );
      if (responsesToDelete.length > 0) {
        // Must delete clarifications first since no cascade
        await prisma.candidatePolicyResponseClarification.deleteMany({
          where: {
            candidatePolicyResponseId: {
              in: responsesToDelete.map((r) => r.id),
            },
          },
        });
        await prisma.candidatePolicyResponse.deleteMany({
          where: { id: { in: responsesToDelete.map((r) => r.id) } },
        });
      }
    }

    return updatedCandidate;
  });

  return updated;
}

export async function deleteCandidate(id: string): Promise<Candidate> {
  const hasPermission = await canManageCandidate(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  // perform soft-delete or archive logic
  const candidate = await prisma.candidate.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return candidate;
}
