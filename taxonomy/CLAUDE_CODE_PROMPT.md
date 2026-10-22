# Prompt for Claude Code: replace the lane list with the full taxonomy

Unzip `lane-taxonomy.zip` into the project root so `./taxonomy/README.md` exists, then paste:

```
I've added the full lane taxonomy in ./taxonomy (34 families, 205 lanes, 1,883 roles). It replaces the current hard-coded list of 34 lanes (Corporate / Independent / Performance / Craft). Read taxonomy/README.md in full first, especially "Using it in the app: matching rules". Then write a short plan and show it to me before changing code.

Requirements:
- Data: load taxonomy/taxonomy.json at build time into typed models (Family, Lane, Role, Ladder). Generate the TypeScript types from the JSON shape. Don't hand-copy lanes into components. Remove the old lane mock data.
- Lane Map (/lanes):
  - Group by family instead of the four old groups.
  - Add filters for family, work mode (employed / public / freelance / owner / performer / gig), payoff curve, entry route and sprint feasibility. Keep the "Relative fit" / "Fit × payoff" toggle.
  - Show results as fit bands (strong fit / worth testing / unlikely), not a 1-205 ranking.
- Lane detail panel:
  - Show the lane's roles grouped by level, with the user's realistic entry point highlighted and the ladder above it (from the lane's ladder template).
  - Roles inside the lane are ranked by matching role tags to the user's profile via tag_to_constructs. Show the top 2-3 roles with a one-line reason.
  - Never recommend manager/director/exec roles as a starting point.
- Sprints: offer a real sprint only for lanes with sprint = direct. Simulated lanes get practice tasks. Shadow lanes get an "interview and shadow" plan instead of a sprint.
- Search: add a job-title search that matches role titles and aliases first, then ESCO labels from taxonomy/esco_mapping.csv, and resolves to a lane. Use it in onboarding ("what do you do now / what are you considering?").
- Payoff: winner_take_all lanes always show a plain-language note that median income in the lane is low.
- Keep mock profile scores for now, but compute lane fit through a single pure function in /lib/matching so real scores can be plugged in later. Unit-test it.
- Don't edit taxonomy.json by hand. If the taxonomy needs changes, edit taxonomy/src/*.txt and run python3 taxonomy/build/build.py.
```
