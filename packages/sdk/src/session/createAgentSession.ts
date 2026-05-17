import { CodexAgentSession } from "./CodexAgentSession";
import type { AgentSession, AgentSessionOptions } from "../types";

/**
 * Creates the default agent session implementation for callers.
 *
 * @param options - Optional session settings passed to the session constructor.
 * @returns An agent session that satisfies the shared session contract.
 */
export function createAgentSession(
  options: AgentSessionOptions = {}
): AgentSession {
  return new CodexAgentSession(options);
}
