import { DEFAULT_FALLBACK_MESSAGE } from "@cortex/shared";
import { Codex, Thread, type ThreadOptions } from "@openai/codex-sdk";

export type PromptResult = {
  output: string;
  threadId: string | null;
};

export type AgentSessionOptions = {
  workingDirectory?: string;
};

export interface AgentSession {
  reset(): void;
  run(prompt: string): Promise<PromptResult>;
}

export class CodexAgentSession implements AgentSession {
  private readonly codex: Codex;
  private readonly threadOptions: ThreadOptions;
  private thread: Thread;

  public constructor(options: AgentSessionOptions = {}) {
    this.codex = new Codex();
    this.threadOptions = {
      workingDirectory: options.workingDirectory,
      skipGitRepoCheck: true,
    };
    this.thread = this.startThread();
  }

  public reset(): void {
    this.thread = this.startThread();
  }

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

  private startThread(): Thread {
    return this.codex.startThread(this.threadOptions);
  }
}

export function createAgentSession(
  options: AgentSessionOptions = {}
): AgentSession {
  return new CodexAgentSession(options);
}

export async function runPrompt(prompt: string): Promise<PromptResult> {
  try {
    const session = createAgentSession();
    return await session.run(prompt);
  } catch {
    return { output: DEFAULT_FALLBACK_MESSAGE, threadId: null };
  }
}
