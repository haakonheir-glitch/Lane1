import { getCurrentUser } from "@/lib/auth";
import { getExport } from "@/lib/data";

/** Downloads everything Lane holds about the signed-in user as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const data = await getExport();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lane-export-${data.user.reportId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
