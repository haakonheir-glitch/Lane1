/**
 * What to do next in a lane, by its sprint feasibility (taxonomy matching rule 5):
 *   direct    → a real 1–3 week sprint
 *   simulated → realistic practice tasks
 *   shadow    → interviews and shadowing (licensed or safety-critical work)
 * Plans are templates filled from the lane's entry roles and demand tags. Pure.
 */
import type { Lane, Role, TagId } from "../taxonomy/generated";
import { TAG_NOUN } from "../matching/roles";

export type PlanStep = { title: string; detail: string };
export type Plan = { kind: "sprint" | "practice" | "shadow"; title: string; intro: string; duration: string; steps: PlanStep[]; measure: string[] };

/** One realistic practice task per demand tag (simulated lanes). */
const PRACTICE: Record<TagId, string> = {
  hunting: "Draft a list of 20 real prospects and write the first message you'd send each type.",
  relationship: "Pick three people in the field and keep a two-week conversation going with each.",
  persuasion: "Write a one-page pitch for a real product or idea and test it on two people.",
  negotiation: "Role-play a price negotiation with a friend using a real offer from the field.",
  technical: "Work through a beginner's tutorial for the field's core tool and finish the exercise at the end.",
  analytical: "Take a real problem from the field and write a one-page analysis with a recommendation.",
  numbers: "Build a small spreadsheet model of a real case (a budget, a forecast or a valuation).",
  writing: "Write two short pieces in the field's style (a brief, a report, an article) and get feedback.",
  creative: "Produce three different first drafts for one brief, then pick and polish one.",
  aesthetic: "Recreate a piece of work you admire from the field, then make your own variation.",
  building: "Build a small, working version of something a junior would build in this field.",
  physical: "Spend a day on the physical side of the work (a course, a trial shift or a volunteer day).",
  outdoor: "Spend a full day doing the outdoor part of the work, in normal weather.",
  precision: "Do a task where small errors matter, then check it against a reference.",
  care: "Volunteer for a few hours where people need care or support.",
  teaching: "Explain one topic from the field to a beginner, then ask them to explain it back.",
  leadership: "Organise a small group to finish one task together, and run the follow-up.",
  visible: "Present something from the field to an audience, even a small one, and record it.",
  solo: "Work alone on one task for a full day with no check-ins.",
  team: "Do one task with two other people and agree on who does what.",
  variable_pay: "Work out what you'd earn at the median and at the top 10% in this lane.",
  risk: "Write down what you would risk to try this lane properly, and your plan if it fails.",
  routine: "Do the same core task every day for a week and note how it feels on day five.",
  shift: "Try a schedule like the lane's (early, late or weekend) for three days.",
  travel: "Plan a realistic month of the lane's travel and check how it fits your life.",
  pressure: "Do one task against a hard deadline and note how you worked.",
  competition: "Enter a small competition or ranking in the field and compare your result.",
  practice: "Practise one core skill for 30 minutes a day for a week and track your progress.",
  autonomy: "Set your own goal and schedule for a week with no one checking in.",
  detail: "Proofread or check someone else's work in the field and list every error.",
};

const SHADOW_QUESTIONS = [
  "What does a normal week look like, hour by hour?",
  "What did you wish you had known before you started?",
  "Which part of the job do people underestimate?",
  "Who does well here, and who leaves in the first two years?",
  "What would you do in your first month if you were starting today?",
  "Could I spend a day with you, or with someone on your team?",
];

const titles = (roles: Role[]) => roles.slice(0, 3).map((r) => r.title);
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);

export function planFor(lane: Lane, startRoles: Role[]): Plan {
  const roleText = list(titles(startRoles)) || lane.name.toLowerCase();
  const tags = [...lane.tags, ...startRoles.flatMap((r) => r.tags)].filter((t, i, a) => a.indexOf(t) === i);
  const demands = tags.slice(0, 3).map((t) => TAG_NOUN[t].toLowerCase());

  if (lane.sprint === "direct") {
    return {
      kind: "sprint",
      title: `Try ${lane.name.toLowerCase()} for real`,
      intro: `${lane.name} is work you can actually do in a short trial. Pick one starting role (${roleText}) and do the real thing for ten days.`,
      duration: "10 days, about an hour a day",
      steps: [
        { title: "Pick one role and one target", detail: `Choose one of: ${roleText}. Set a number you can count by day 10.` },
        { title: "Learn the basics in a day", detail: "Find one beginner guide and one practitioner's account of the job. Note the three things they all mention." },
        { title: "Do the work every day", detail: `Spend each session on the core of the lane: ${list(demands)}.` },
        { title: "Log each session", detail: "After each session, record energy, flow and whether you'd keep going." },
        { title: "Get one outside opinion", detail: "Show your work to someone who does this for a living and ask what a beginner gets wrong." },
        { title: "Close out", detail: "Compare your first three days with your last three, then decide: continue, adjust or stop." },
      ],
      measure: ["Your count against the target", "Improvement from first to last third", "Energy and flow per session", "Whether you'd continue"],
    };
  }
  if (lane.sprint === "simulated") {
    return {
      kind: "practice",
      title: `Practice tasks: ${lane.name.toLowerCase()}`,
      intro: `The real work in ${lane.name.toLowerCase()} needs a job or a qualification first, but realistic practice tasks can tell you a lot. They're built around what the starting roles (${roleText}) actually do.`,
      duration: "1–2 weeks",
      steps: tags.slice(0, 4).map((t) => ({ title: TAG_NOUN[t], detail: PRACTICE[t] })),
      measure: ["How long each task took you", "Which task you'd happily do again", "Feedback from one practitioner"],
    };
  }
  // Interview people who practise the work (mid level), not the trainees you'd start beside.
  const practitioners = list(titles(lane.roles.filter((r) => r.level === "mid"))) || roleText;
  return {
    kind: "shadow",
    title: `Interview and shadow: ${lane.name.toLowerCase()}`,
    intro: `${lane.name} is licensed or safety-critical work, so you can't try it directly. Talk to people who do it, then watch a day of it.`,
    duration: "2–3 weeks",
    steps: [
      { title: "Find three practitioners", detail: `Look for people working as ${practitioners}. Alumni, LinkedIn and local employers work well.` },
      { title: "Hold three short interviews", detail: SHADOW_QUESTIONS.join(" ") },
      { title: "Ask for a shadow day", detail: "Ask one of them if you can spend a day alongside them, or visit an open day or a job fair." },
      { title: "Do one related task", detail: PRACTICE[tags[0] ?? "practice"] },
      { title: "Write down what you saw", detail: "What surprised you, what you'd enjoy daily, and what you'd dread." },
    ],
    measure: ["What surprised you", "Which parts you'd enjoy every day", "Whether you'd start the training route"],
  };
}
