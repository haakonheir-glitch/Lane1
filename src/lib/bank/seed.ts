/**
 * Seeds for generated items. The package specifies hash(userId + taskId + attemptNumber);
 * we use FNV-1a (32-bit) on "userId:taskId:attempt", then mix in the item index so each
 * item in a task gets its own seed. Deterministic: the server can regenerate any item
 * from (user, task, attempt, index) and never needs to store or send the item itself.
 */

/** FNV-1a 32-bit hash of a string. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed for one generated item. Knuth's multiplicative constant spreads consecutive indices. */
export function seedFor(userId: string, taskId: string, attempt: number, itemIndex: number): number {
  const base = fnv1a(`${userId}:${taskId}:${attempt}`);
  return (base + Math.imul(itemIndex + 1, 2654435761)) >>> 0;
}
