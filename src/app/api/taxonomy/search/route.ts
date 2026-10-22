import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findJobTitles } from "@/lib/taxonomy";

/** Job-title search for onboarding: role titles and aliases first, then ESCO labels. */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return Response.json({ error: "Not signed in" }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  return Response.json({ hits: findJobTitles(q, 8) }, { headers: { "Cache-Control": "private, max-age=300" } });
}
