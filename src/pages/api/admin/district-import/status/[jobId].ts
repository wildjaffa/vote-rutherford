import type { APIRoute } from "astro";
import { parse } from "cookie";
import prisma from "../../../../../lib/prisma";
import { canManageDistricts } from "../../../../../lib/permissions";
import { getSessionUser } from "../../../../../firebase/server";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const jobId = params.jobId;

  if (!jobId) {
    return new Response(JSON.stringify({ error: "Job ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check authentication (simplified for now)
    const cookies = parse(request.headers.get("cookie") || "");
    const sessionCookie = cookies["__session"];
    const user = await getSessionUser(sessionCookie);
    if (!user || !(await canManageDistricts(user.uid))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const job = await prisma.districtImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (job.createdBy !== user.uid) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        id: job.id,
        status: job.status,
        progress: job.progress,
        districtMapping: job.districtMapping,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching import status:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch import status",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
