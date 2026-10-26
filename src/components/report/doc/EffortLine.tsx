import type { Effort } from "@/lib/data/effort";
import { effortLine } from "@/lib/data/effort";
import { CountUp } from "./CountUp";

/** "5 sessions · 412 answers · 12 tasks · 205 career paths"; the numbers count up on the reveal. */
export function EffortLine({ effort, countUp }: { effort: Effort; countUp?: boolean }) {
  if (!countUp) return <>{effortLine(effort)}</>;
  const parts: [number, string][] = [
    [effort.sessions, effort.sessions === 1 ? "session" : "sessions"],
    [effort.answers, "answers"],
    [effort.tasks, "tasks"],
    [effort.careerPaths, "career paths"],
  ];
  return (
    <>
      {parts.map(([n, w], i) => (
        <span key={w}>
          {i > 0 ? " · " : ""}
          <CountUp to={n} /> {w}
        </span>
      ))}
    </>
  );
}
