import prisma, { withUserContext } from "../prisma";
import type { Candidate, Prisma } from "../../generated/prisma/client";
import { UpsertCandidate } from "../models/upsertCandidate";
import type { UpsertCandidateType } from "../models/upsertCandidate";
import { canManageCandidate, canManageRace } from "../permissions";
import { makeError } from "./utils";

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
  userId: string,
): Promise<Candidate> {
  // perform validation and permission check as in original API
  const validated = await validateCandidatePayload(data);

  const raceId = validated.raceId;
  // ensure race exists and user can manage it
  if (!raceId) {
    throw makeError("Missing raceId", 400);
  }

  const hasPermission = await canManageRace(raceId);
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
  const candidate = await withUserContext(userId, async () => {
    const {
      firstName,
      lastName,
      slug,
      middleName,
      email,
      partyAffiliation,
      birthYear,
      profileImageId,
      externalLinks,
      policyResponses,
      qualifications,
      isIncumbent,
    } = validated;
    const candidateData: Prisma.CandidateUncheckedCreateInput = {
      firstName,
      lastName,
      raceId,
      slug,
      middleName: middleName ?? null,
      email: email ?? null,
      partyAffiliation,
      birthYear: birthYear ?? null,
      profileImageId: profileImageId ?? null,
      isIncumbent: isIncumbent ?? false,
    };
    const newCandidate = await prisma.candidate.create({
      data: candidateData,
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

    if (qualifications && qualifications.length > 0) {
      const types = await prisma.qualificationType.findMany({
        where: { value: { in: qualifications.map((l) => l.type) } },
      });
      for (const qualification of qualifications) {
        const qualificationType = types.find(
          (t) => t.value === qualification.type,
        );
        if (!qualificationType) continue;
        await prisma.candidateQualification.create({
          data: {
            candidateId: newCandidate.id,
            qualificationTypeId: qualificationType.id,
            qualification_url: qualification.url || null,
            qualification_description: qualification.displayText,
          },
        });
      }
    }

    return newCandidate;
  });
  return candidate;
}

export async function updateCandidate(
  id: string,
  body: UpsertCandidateType,
  userId: string,
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
    email,
    partyAffiliation,
    birthYear,
    profileImageId,
    externalLinks,
    policyResponses,
    qualifications,
    isIncumbent,
  } = validationData;

  const updated = await withUserContext(userId, async () => {
    const data: Prisma.CandidateUncheckedUpdateInput = {
      ...(firstName && { firstName }),
      ...(middleName !== undefined && { middleName: middleName || null }),
      ...(lastName && { lastName }),
      ...(email !== undefined && { email: email || null }),
      ...(partyAffiliation && { partyAffiliation }),
      ...(birthYear !== undefined && { birthYear: birthYear || null }),
      updatedAt: new Date(),
      isIncumbent: isIncumbent ?? false,
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

    if (qualifications !== undefined) {
      const existingQualifications =
        await prisma.candidateQualification.findMany({
          where: { candidateId: id },
        });

      // Qualifications to delete
      const qualificationsToDelete = existingQualifications.filter(
        (existing) => !qualifications.some((q) => q.id === existing.id),
      );
      if (qualificationsToDelete.length > 0) {
        await prisma.candidateQualification.deleteMany({
          where: { id: { in: qualificationsToDelete.map((q) => q.id) } },
        });
      }

      // Sync qualifications
      if (qualifications.length > 0) {
        const types = await prisma.qualificationType.findMany({
          where: { value: { in: qualifications.map((q) => q.type) } },
        });

        for (const qualification of qualifications) {
          const qualificationType = types.find(
            (t) => t.value === qualification.type,
          );
          if (!qualificationType) continue;

          if (qualification.id) {
            // Update
            await prisma.candidateQualification.update({
              where: { id: qualification.id },
              data: {
                qualificationTypeId: qualificationType.id,
                qualification_url: qualification.url || null,
                qualification_description: qualification.displayText,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create
            await prisma.candidateQualification.create({
              data: {
                candidateId: id,
                qualificationTypeId: qualificationType.id,
                qualification_url: qualification.url || null,
                qualification_description: qualification.displayText,
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
                  candidatePolicyResponseId: targetResponseId,
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

export async function partialUpdateCandidate(
  id: string,
  body: Partial<UpsertCandidateType>,
  userId: string,
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

  // We only run validation on provided keys using Zod's safeParse on the partial schema
  // We avoid validateCandidatePayload because it expects full data
  const { UpsertCandidate, upsertCandidateSchema } = await import("../models/upsertCandidate");
  const validation = upsertCandidateSchema.partial().safeParse(body);
  
  if (!validation.success) {
    throw makeError("Validation failed", undefined, validation.error);
  }

  const dataToUpdate: Prisma.CandidateUncheckedUpdateInput = {
    updatedAt: new Date(),
  };

  const {
    firstName,
    lastName,
    middleName,
    email,
    partyAffiliation,
    birthYear,
    isIncumbent,
    slug
  } = validation.data;

  if (firstName !== undefined) dataToUpdate.firstName = firstName;
  if (lastName !== undefined) dataToUpdate.lastName = lastName;
  if (middleName !== undefined) dataToUpdate.middleName = middleName || null;
  if (email !== undefined) dataToUpdate.email = email || null;
  if (partyAffiliation !== undefined) dataToUpdate.partyAffiliation = partyAffiliation;
  if (birthYear !== undefined) dataToUpdate.birthYear = birthYear || null;
  if (isIncumbent !== undefined) dataToUpdate.isIncumbent = isIncumbent;
  if (slug !== undefined) dataToUpdate.slug = slug;

  const updated = await withUserContext(userId, async () => {
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: dataToUpdate,
    });
    return updatedCandidate;
  });

  return updated;
}

export async function deleteCandidate(
  id: string,
  userId: string,
): Promise<Candidate> {
  const hasPermission = await canManageCandidate(id);
  if (!hasPermission) {
    throw makeError("Unauthorized", 403);
  }

  // perform soft-delete or archive logic
  const candidate = await withUserContext(userId, () =>
    prisma.candidate.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  );
  return candidate;
}
