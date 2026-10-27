/**
 * backward_digits and corsi: adaptive span with SPAN_PROTOCOL / CORSI_PROTOCOL from the
 * generators (start 3, 2 trials per length, max 10 for digits and 9 for Corsi, stop when both
 * trials at a length are wrong). Span = the longest length with at least one correct trial, never
 * above the protocol's maximum. Also total correct trials.
 */
export type SpanProtocol = { startLength: number; trialsPerLength: number; maxLength: number };
export type SpanTrialResult = { length: number; correct: boolean };

/** Next length to present, or null when the task is over. */
export function nextSpanLength(history: SpanTrialResult[], p: SpanProtocol): number | null {
  if (history.length === 0) return p.startLength;
  const last = history[history.length - 1]!;
  const atLength = history.filter((h) => h.length === last.length);
  if (atLength.length < p.trialsPerLength) return last.length;
  if (atLength.every((h) => !h.correct)) return null;
  return last.length >= p.maxLength ? null : last.length + 1;
}

export function scoreSpan(history: SpanTrialResult[], maxLength = Infinity) {
  const passed = history.filter((h) => h.correct).map((h) => h.length);
  // Sessions recorded before the Corsi fix can hold a "length 10" trial that was really 9 taps.
  return { span: passed.length ? Math.min(Math.max(...passed), maxLength) : 0, correctTrials: passed.length, trials: history.length };
}

export function markSpan(response: number[], correctResponse: number[]): boolean {
  return response.length === correctResponse.length && response.every((v, i) => v === correctResponse[i]);
}
