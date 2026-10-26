import { getMyProfile, getTopCareerPaths, getUser } from "@/lib/data";
import { renderShareCard } from "@/lib/og/share-image";
import { shareCardFrom } from "@/lib/og/share-card";

/**
 * The signed-in person's share card as a PNG, generated on request and never stored. Opt-in
 * only: the person asks for it. Personality and reasoning appear only with ?personality=1 and
 * ?reasoning=1. ?download=1 sends it as a file.
 */
export async function GET(req: Request) {
  const [profile, user, picks] = await Promise.all([getMyProfile(), getUser(), getTopCareerPaths()]);
  if (!profile) return new Response("Complete session S1 first.", { status: 404 });
  const q = new URL(req.url).searchParams;
  const card = shareCardFrom(profile, user.name.split(" ")[0] ?? user.name, picks, { personality: q.get("personality") === "1", reasoning: q.get("reasoning") === "1" });
  const img = await renderShareCard(card);
  const headers = new Headers(img.headers);
  headers.set("Cache-Control", "private, no-store");
  if (q.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="career-profile-${card.firstName.toLowerCase()}.png"`);
  return new Response(img.body, { headers });
}
