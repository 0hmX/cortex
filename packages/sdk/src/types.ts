/**
 * Represents a single agent response payload.
 */
export type PromptResult = {
  output: string;
  threadId: string | null;
};

/**
 * Defines optional runtime settings for a session.
 */
export type AgentSessionOptions = {
  workingDirectory?: string;
};

/**
 * Describes the session contract used by the CLI.
 */
export interface AgentSession {
  /**
   * Starts a fresh thread for the next prompt run.
   */
  reset(): void;

  /**
   * Sends one prompt and returns the final response payload.
   */
  run(prompt: string): Promise<PromptResult>;
}
