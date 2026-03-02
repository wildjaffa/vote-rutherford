import type { APIRoute } from "astro";
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!fileEntry || !(fileEntry instanceof Blob)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const record = await import("../../../../lib/services/blobs").then((m) =>
      m.uploadBlob(fileEntry as Blob),
    );

    return new Response(JSON.stringify(record), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error uploading blob:", error);
    const status = error.code === 403 ? 403 : error.code === 400 ? 400 : 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to upload file",
        details: error.details,
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
