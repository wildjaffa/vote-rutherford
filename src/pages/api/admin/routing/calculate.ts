import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { requireLocalUser } from "../../../../lib/permissions";
import {
  calculateSignRoutes,
  type SignTask,
  type VotingPeriod,
} from "../../../../lib/services/signLogistics";
import { isServiceError } from "../../../../lib/services/utils";

export const prerender = false;

const inputSchema = z.object({
  electionId: z.string().min(1),
  period: z.enum(["EARLY_VOTING", "DAY_OF_VOTING"]),
  task: z.enum(["DROP_OFF", "PICK_UP"]),
});

export const POST: APIRoute = async ({ request, locals }) => {
  requireLocalUser(locals);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("electionId, period, and task are required", 400);
  }

  try {
    const plan = await calculateSignRoutes(
      parsed.data.electionId,
      parsed.data.period as VotingPeriod,
      parsed.data.task as SignTask,
    );
    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calculating sign routes:", error);
    if (isServiceError(error) && error.code) {
      return jsonError(error.message, error.code);
    }
    const message =
      error instanceof Error ? error.message : "Failed to calculate routes";
    return jsonError(message, 500);
  }
};

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
