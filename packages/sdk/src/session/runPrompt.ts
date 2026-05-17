import { DEFAULT_FALLBACK_MESSAGE } from "@cortex/shared";

import { createAgentSession } from "./createAgentSession";
import type { PromptResult } from "../types";

/**
 * Runs one prompt in a fresh session for simple call sites.
 *
 * @param prompt - The prompt text to execute in a brand-new agent session.
 * @returns A normalized prompt result, including fallback output on failure.
 */
export async function runPrompt(prompt: string): Promise<PromptResult> {
  try {
    const session = createAgentSession();
    return await session.run(prompt);
  } catch {
    return { output: DEFAULT_FALLBACK_MESSAGE, threadId: null };
  }
}
