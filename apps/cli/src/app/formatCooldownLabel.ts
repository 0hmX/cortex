/**
 * Formats a run duration into a compact cooldown label for the prompt UI.
 *
 * @param durationMs - Cooldown duration in milliseconds.
 * @returns A human-readable duration label.
 */
export function formatCooldownLabel(durationMs: number): string {
  if (durationMs < 1_000) {
    return `${Math.ceil(durationMs)}ms`;
  }

  if (durationMs < 10_000) {
    return `${(durationMs / 1_000).toFixed(1)}s`;
  }

  return `${Math.ceil(durationMs / 1_000)}s`;
}
