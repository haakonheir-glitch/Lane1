/**
 * The site's public address, for canonical URLs and share images. Set NEXT_PUBLIC_SITE_URL for a
 * custom domain; on Vercel the production address is provided automatically.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const SITE_TITLE = "Lane — Find the work you're built for.";
export const SITE_DESCRIPTION =
  "Validated tests of your interests, personality, values and reasoning, matched against 205 career paths. Measured, not guessed. Free during the pilot.";
