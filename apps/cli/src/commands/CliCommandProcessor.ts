import { CliFileLogger } from "../logging/CliFileLogger";
import { TranscriptStore } from "../transcript/TranscriptStore";
import type { CommandExecutionResult } from "../types";

/**
 * Handles slash commands and returns the resulting UI state changes.
 *
 * @remarks
 * The processor only handles known slash commands and leaves other input alone.
 */
export class CliCommandProcessor {
  private readonly transcriptStore: TranscriptStore;
  private readonly logger: CliFileLogger;
  private readonly onExit: () => void;

  /**
   * Creates a command processor with the collaborators it mutates.
   *
   * @param options - Dependencies required to mutate transcript, logs, and exit flow.
   * @returns A command processor ready to execute slash commands.
   */
  public constructor(options: {
    transcriptStore: TranscriptStore;
    logger: CliFileLogger;
    onExit: () => void;
  }) {
    this.transcriptStore = options.transcriptStore;
    this.logger = options.logger;
    this.onExit = options.onExit;
  }

  /**
   * Executes one slash command and returns the next command state.
   *
   * @param rawValue - Raw composer text that may contain a slash command.
   * @returns A command execution result describing whether input was handled.
   */
  public execute(rawValue: string): CommandExecutionResult {
    const command = rawValue.trim().toLowerCase();
    this.logger.logCommand(command);

    if (command === "/exit") {
      this.onExit();
      return {
        handled: true,
        entries: this.transcriptStore.getEntries(),
        status: "Shutting down",
      };
    }

    return {
      handled: false,
      entries: this.transcriptStore.getEntries(),
      status: "Ready",
    };
  }
}
