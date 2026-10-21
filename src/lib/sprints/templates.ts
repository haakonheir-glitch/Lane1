/**
 * Sprint templates. Lanes with a hand-written template get a specific trial; every other
 * lane gets a generic "taste test" built from the lane's name.
 */
import { laneMeta } from "../assessment/lanes";
import type { SprintMetric } from "../types";

export type SprintTemplate = {
  id: string;
  laneId: string;
  title: string;
  brief: string;
  tasks: [title: string, detail: string][];
  metrics: SprintMetric[];
  chart: { label: string; unit: string; numerator: string; denominator?: string; scale?: number };
};

const specific: SprintTemplate[] = [
  {
    id: "sales-calls",
    laneId: "sales-b2b",
    title: "Hold 20 discovery conversations",
    brief:
      "Call small local businesses about a real product or service (ask a friend's company if you can pitch theirs). Track dials, conversations and booked meetings. The point is not the meetings; it is how fast your conversation rate improves and how you feel at the end of each day.",
    tasks: [
      ["Build a list of 60 prospects", "Small businesses, 5–50 employees, with a named owner."],
      ["Write a 30-second opener", "Say it out loud three times. Record one take."],
      ["First 15 dials", "Log every dial, even voicemails."],
      ["Review your notes", "Where did conversations end, and why?"],
      ["Rewrite the opener", "Change one thing only, based on yesterday's notes."],
      ["15 dials with the new opener", "Aim for one booked meeting."],
      ["Handle three objections in writing", "Price, timing, \"we already have someone\"."],
      ["20 dials", "Try calling between 08:00 and 09:00."],
      ["First discovery meeting", "Ask questions for 80% of the time."],
      ["Mid-sprint review", "Compare days 1–5 with days 6–9."],
      ["20 dials", "Use the objection notes."],
      ["Second discovery meeting", "Try to agree a concrete next step."],
      ["Final 20 dials", "Same opener as day 11."],
      ["Close-out", "Final check-in and a 5-line summary."],
    ],
    metrics: [
      { key: "dials", label: "Dials", unit: "n" },
      { key: "conversations", label: "Conversations", unit: "n" },
      { key: "meetings", label: "Meetings", unit: "n" },
    ],
    chart: { label: "Conversation rate", unit: "%", numerator: "conversations", denominator: "dials", scale: 100 },
  },
  {
    id: "short-videos",
    laneId: "content",
    title: "Publish 5 short videos",
    brief:
      "Publish five vertical videos under 60 seconds on one topic you know well. Track average watch-through and how long each takes to make.",
    tasks: [
      ["Pick one topic and five angles", "Write each as a one-line hook."],
      ["Script and record video 1", "Under 60 seconds, one take allowed."],
      ["Edit and publish video 1", "Note the total time spent."],
      ["Record video 2", "Change the first three seconds."],
      ["Publish video 2", "Post at a different time of day."],
      ["Record and publish video 3", ""],
      ["Review watch-through", "Where do people drop off?"],
      ["Record and publish video 4", ""],
      ["Record and publish video 5", ""],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "published", label: "Published", unit: "n" },
      { key: "watch", label: "Avg watch-through", unit: "%" },
      { key: "hours", label: "Production time", unit: "h" },
    ],
    chart: { label: "Avg watch-through", unit: "%", numerator: "watch" },
  },
  {
    id: "user-interviews",
    laneId: "ux-research",
    title: "Run 4 user interviews",
    brief: "Interview four people about how they handle an everyday task (tracking expenses works well), then write a one-page synthesis. Track usable insights per interview.",
    tasks: [
      ["Write a discussion guide", "Ten open questions, no leading ones."],
      ["Recruit four participants", "Not friends or colleagues."],
      ["Interview 1", "Record with consent."],
      ["Interview 2", ""],
      ["Interviews 3 and 4", ""],
      ["Synthesis", "Cluster notes into themes."],
      ["Close-out", "One-page summary and final check-in."],
    ],
    metrics: [
      { key: "interviews", label: "Interviews", unit: "n" },
      { key: "insights", label: "Usable insights", unit: "n" },
    ],
    chart: { label: "Insights per interview", unit: "n", numerator: "insights", denominator: "interviews" },
  },
  {
    id: "source-candidates",
    laneId: "recruiting",
    title: "Source and screen 15 candidates",
    brief: "Find 15 plausible candidates for a real open role (a friend's company hiring is ideal) and run five short screening calls.",
    tasks: [
      ["Read the role and talk to the hiring manager", "What does great look like in month three?"],
      ["Source 15 profiles", "LinkedIn, communities, referrals."],
      ["Write and send outreach", "Personalise the first line for each person."],
      ["Screening calls 1–2", "Use the same five questions each time."],
      ["Screening calls 3–5", ""],
      ["Write a shortlist", "Three names, with one reason each."],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "contacted", label: "Contacted", unit: "n" },
      { key: "replies", label: "Replies", unit: "n" },
    ],
    chart: { label: "Reply rate", unit: "%", numerator: "replies", denominator: "contacted", scale: 100 },
  },
  {
    id: "coach-three",
    laneId: "coaching",
    title: "Coach three people, three sessions each",
    brief: "Run nine short coaching sessions with three volunteers, each working toward a concrete goal they choose. Track their progress and your own energy after each session.",
    tasks: [
      ["Recruit three volunteers", "People with a goal they can reach in two weeks."],
      ["Define one measurable goal each", "Write it down with them."],
      ["Session 1 with each person", "Listen more than you talk."],
      ["Reflect and adjust your format", "What worked, what didn't?"],
      ["Session 2 with each person", ""],
      ["Midway review", "Is anyone stuck? Why?"],
      ["Session 3 with each person", ""],
      ["Ask for honest feedback", "One thing to keep, one to change."],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "sessions", label: "Sessions held", unit: "n" },
      { key: "progress", label: "Avg goal progress", unit: "%" },
    ],
    chart: { label: "Avg goal progress", unit: "%", numerator: "progress" },
  },
  {
    id: "product-spec",
    laneId: "product",
    title: "Write and test one product spec",
    brief: "Write a one-page spec for a small feature in a product you use, test it with three users and one engineer, and revise it.",
    tasks: [
      ["Pick a feature and the problem it solves", "One sentence each."],
      ["Talk to two users about the problem", "Don't mention your idea yet."],
      ["Draft the one-pager", "Problem, users, solution, how you'd measure it."],
      ["Review with an engineer", "What's hard? What's missing?"],
      ["Test the idea with three users", "Sketches are enough."],
      ["Revise the spec", "Cut anything nobody asked for."],
      ["Write the 'why now'", "Make the case in five sentences."],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "conversations", label: "User conversations", unit: "n" },
      { key: "changes", label: "Spec changes", unit: "n" },
    ],
    chart: { label: "User conversations", unit: "n", numerator: "conversations" },
  },
  {
    id: "micro-product",
    laneId: "founder",
    title: "Get one paying customer",
    brief: "Pick a small problem, offer a simple paid solution (a service is fine) and try to get one person to pay for it. Track conversations and how many people say yes.",
    tasks: [
      ["List 10 problems people pay to solve", "Ones you've seen up close."],
      ["Pick one and write the offer", "One paragraph, one price."],
      ["Make a one-page landing page or message", "No logo needed."],
      ["Reach out to 10 potential customers", ""],
      ["Follow up and reach 10 more", ""],
      ["Review: who replied, who didn't?", "Change one thing."],
      ["Reach 10 more with the revised offer", ""],
      ["Deliver to anyone who said yes", "Or offer a paid pilot."],
      ["Ask for a payment", "Even a small one counts."],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "reached", label: "People reached", unit: "n" },
      { key: "interested", label: "Interested", unit: "n" },
    ],
    chart: { label: "Interest rate", unit: "%", numerator: "interested", denominator: "reached", scale: 100 },
  },
  {
    id: "pitch-stories",
    laneId: "journalist",
    title: "Pitch three stories",
    brief: "Find three story ideas, report one properly, and pitch all three to real editors. Track pitches sent and replies.",
    tasks: [
      ["Find ten possible stories", "Local, specific, with a person at the centre."],
      ["Pick three and write one-line pitches", ""],
      ["Interview two sources for story one", ""],
      ["Write a 600-word draft", ""],
      ["Find the right editor for each pitch", "Name and email, not a generic inbox."],
      ["Send all three pitches", ""],
      ["Follow up once", ""],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "pitches", label: "Pitches sent", unit: "n" },
      { key: "replies", label: "Replies", unit: "n" },
    ],
    chart: { label: "Pitches sent", unit: "n", numerator: "pitches" },
  },
];

function generic(laneId: string): SprintTemplate {
  const name = laneMeta[laneId]?.name ?? laneId;
  const lower = name.toLowerCase();
  return {
    id: `taste-${laneId}`,
    laneId,
    title: `Taste test: ${name}`,
    brief: `A one-week trial of the real work of a ${lower}: talk to people who do it, then do a small piece of the work yourself. Track hours of real work and what you produced.`,
    tasks: [
      [`Talk to a working ${lower}`, "Ask what a normal Tuesday looks like."],
      ["Find the smallest real piece of the work you can do", "Something with a visible output."],
      ["Do it, for two focused hours", ""],
      ["Get feedback from someone who knows", ""],
      ["Do it again, improved", ""],
      ["Talk to a second practitioner", "What separates good from great?"],
      ["Close-out", "Final check-in and summary."],
    ],
    metrics: [
      { key: "hours", label: "Hours of real work", unit: "h" },
      { key: "outputs", label: "Outputs produced", unit: "n" },
    ],
    chart: { label: "Hours of real work", unit: "h", numerator: "hours" },
  };
}

export function templateForLane(laneId: string): SprintTemplate {
  return specific.find((t) => t.laneId === laneId) ?? generic(laneId);
}

export function templateById(id: string): SprintTemplate | undefined {
  if (id.startsWith("taste-")) return laneMeta[id.slice(6)] ? generic(id.slice(6)) : undefined;
  return specific.find((t) => t.id === id);
}
