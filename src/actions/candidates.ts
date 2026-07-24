import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import {
  upsertCandidateSchema,
  type UpsertCandidateType,
} from "../lib/models/upsertCandidate";
import * as candidateService from "../lib/services/candidates";
import { getCurrentUserId } from "../lib/permissions";
import { handleActionError } from "./utils";

export const createCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema,
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      return await candidateService.createCandidate(input, userId);
    } catch (err) {
      handleActionError(err, "Failed to create candidate");
    }
  },
});

export const updateCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema.extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      return await candidateService.updateCandidate(id, data, userId);
    } catch (err) {
      handleActionError(err, "Failed to update candidate");
    }
  },
});

export const partialUpdateCandidate = defineAction({
  accept: "json",
  input: upsertCandidateSchema.partial().extend({ id: z.string() }),
  handler: async (input, context) => {
    const { id, ...data } = input;
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      // Cast to Partial<UpsertCandidateType> to handle exactOptionalPropertyTypes if necessary
      return await candidateService.partialUpdateCandidate(
        id,
        data as Partial<UpsertCandidateType>,
        userId,
      );
    } catch (err) {
      handleActionError(err, "Failed to update candidate");
    }
  },
});

export const deleteCandidate = defineAction({
  accept: "json",
  input: z.object({ id: z.string() }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      return await candidateService.deleteCandidate(input.id, userId);
    } catch (err) {
      handleActionError(err, "Failed to delete candidate");
    }
  },
});

export const sendMassEmail = defineAction({
  accept: "json",
  input: z.object({
    subject: z.string().min(1, "Subject is required"),
    bodyTemplate: z.string().min(1, "Body template is required"),
    userGoogleAccountId: z.string().optional(),
    targets: z
      .array(
        z.object({
          id: z.string().optional(),
          email: z.string().email(),
          variables: z.record(z.string(), z.string()).optional(),
        }),
      )
      .min(1, "At least one target is required"),
    targetType: z.enum(["candidate", "contact"]).default("candidate"),
    scheduledAt: z.string().optional(),
    includeSignature: z.boolean().optional(),
    signatureName: z.string().optional(),
    signatureTitle: z.string().optional(),
  }),
  handler: async (input, context) => {
    const { addEmailJobs } = await import("../lib/jobs/emailQueue");

    // Validate permission
    await getCurrentUserId(context.cookies.get("__session")?.value);

    const url = new URL(context.request.url);
    const baseUrl = process.env.PUBLIC_SITE_URL || url.origin;
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    // Calculate delay if scheduledAt is provided
    let delayMs = 0;
    if (input.scheduledAt) {
      const scheduledDate = new Date(input.scheduledAt);
      const now = new Date();
      delayMs = Math.max(0, scheduledDate.getTime() - now.getTime());
    }

    // Build personalized job data for each recipient
    const jobData = input.targets.map((target) => {
      let personalizedBody = input.bodyTemplate;
      if (target.variables) {
        for (const [key, value] of Object.entries(target.variables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
          personalizedBody = personalizedBody.replace(regex, value as string);
        }
      }

      if (input.includeSignature) {
        const name = input.signatureName || "Joshua D. Jensen";
        const title = input.signatureTitle || "Co-President, Vote Rutherford";
        personalizedBody += `<br /><br />--<br />Sincerely,<br />${name}<br />${title}<br /><br /><a href="https://GoVoteRutherford.com">GoVoteRutherford.com</a><br /><br /><span style="font-style: italic; color: #555;">&quot;Wherever the people are well informed, they can be trusted with their own government.&quot;</span> - Thomas Jefferson<br /><br /><img src="${cleanBaseUrl}/Email-Logo.png" alt="Vote Rutherford Logo" border="0" style="width: 400px; max-width: 100%; height: auto; border: none; display: block;" />`;
      }

      const fullHtmlBody = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${input.subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #333333;
    }
    table {
      border-collapse: collapse;
    }
    p {
      margin-top: 0;
      margin-bottom: 1em;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
    <tr>
      <td align="left" style="padding: 10px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">
        ${personalizedBody}
      </td>
    </tr>
  </table>
</body>
</html>`;

      return {
        candidateId:
          input.targetType === "candidate" ? (target.id ?? null) : null,
        contactId: input.targetType === "contact" ? (target.id ?? null) : null,
        emailAddress: target.email,
        subject: input.subject,
        body: fullHtmlBody,
        userGoogleAccountId: input.userGoogleAccountId ?? "",
      };
    });

    try {
      await addEmailJobs(jobData, delayMs);
      return { success: true, count: jobData.length };
    } catch (err) {
      handleActionError(err, "Failed to enqueue email jobs");
    }
  },
});

export const promoteCandidate = defineAction({
  accept: "json",
  input: z.object({
    candidateId: z.string(),
    targetRaceId: z.string(),
  }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      return await candidateService.promoteCandidate(
        input.candidateId,
        input.targetRaceId,
        userId,
      );
    } catch (err) {
      handleActionError(err, "Failed to promote candidate");
    }
  },
});

export const moveCandidate = defineAction({
  accept: "json",
  input: z.object({
    candidateId: z.string(),
    targetRaceId: z.string(),
  }),
  handler: async (input, context) => {
    const userId = await getCurrentUserId(
      context.cookies.get("__session")?.value,
    );
    try {
      return await candidateService.moveCandidate(
        input.candidateId,
        input.targetRaceId,
        userId,
      );
    } catch (err) {
      handleActionError(err, "Failed to move candidate");
    }
  },
});

export const resendEmail = defineAction({
  accept: "json",
  input: z.object({
    id: z.string(),
    userGoogleAccountId: z.string().optional(),
  }),
  handler: async (input, context) => {
    const { addEmailJobs } = await import("../lib/jobs/emailQueue");
    const prisma = await import("../lib/prisma").then((m) => m.default);

    await getCurrentUserId(context.cookies.get("__session")?.value);

    const outreach = await prisma.emailOutreach.findUnique({
      where: { id: input.id },
    });

    if (!outreach) {
      throw new Error("Email outreach record not found");
    }

    try {
      await addEmailJobs([
        {
          candidateId: outreach.candidateId,
          contactId: outreach.contactId,
          emailAddress: outreach.emailAddress,
          subject: outreach.subject,
          body: outreach.body,
          userGoogleAccountId: input.userGoogleAccountId ?? "",
        },
      ]);
      return { success: true };
    } catch (err) {
      handleActionError(err, "Failed to enqueue resend job");
    }
  },
});
