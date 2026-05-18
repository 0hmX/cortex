import { DEFAULT_FALLBACK_MESSAGE } from "@cortex/shared";
import { Codex, Thread, type ThreadOptions } from "@openai/codex-sdk";

import type { AgentSession, AgentSessionOptions, PromptResult } from "../types";

/**
 * Wraps the Codex SDK thread lifecycle behind the app session contract.
 *
 * @remarks
 * This class owns a single active Codex thread and can replace it on reset.
 */
export class CodexAgentSession implements AgentSession {
  private readonly codex: Codex;
  private readonly threadOptions: ThreadOptions;
  private thread: Thread;

  /**
   * Creates a reusable Codex session for one working directory.
   *
   * @param options - Optional session settings such as the working directory.
   * @returns A new session instance backed by a fresh Codex thread.
   */
  public constructor(options: AgentSessionOptions = {}) {
    this.codex = new Codex();
    this.threadOptions = {
      approvalPolicy: "never",
      sandboxMode: "danger-full-access",
      workingDirectory: options.workingDirectory,
      skipGitRepoCheck: true,
    };
    this.thread = this.startThread();
  }

  /**
   * Replaces the active thread with a fresh one.
   *
   * @returns Nothing.
   */
  public reset(): void {
    this.thread = this.startThread();
  }

  /**
   * Runs a prompt and normalizes both success and failure output.
   *
   * @param prompt - The user prompt to send to the active Codex thread.
   * @returns A normalized response payload with output text and the thread id.
   */
  public async run(prompt: string): Promise<PromptResult> {
    try {
      const turn = await this.thread.run(prompt);

      return {
        output: turn.finalResponse || DEFAULT_FALLBACK_MESSAGE,
        threadId: this.thread.id,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : DEFAULT_FALLBACK_MESSAGE;

      return {
        output: message,
        threadId: this.thread.id,
      };
    }
  }

  /**
   * Starts a new SDK thread using the stored session options.
   *
   * @returns A newly created Codex SDK thread.
   */
  private startThread(): Thread {
    return this.codex.startThread(this.threadOptions);
  }
}
