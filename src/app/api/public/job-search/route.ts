import type { NextRequest } from "next/server";
import { findJobTitles } from "@/lib/taxonomy";

/**
 * Public job-title search for the landing page ("Is your job in here?"). Same lookup as
 * onboarding (role titles and aliases first, then ESCO labels); it reads only the public
 * taxonomy, never anything about a person, so it needs no session.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  return Response.json({ hits: findJobTitles(q, 6) }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
