import { CliFileLogger } from "../logging/CliFileLogger";
import type { CommandExecutionResult } from "../types";

/**
 * Handles slash commands and returns the resulting UI state changes.
 *
 * @remarks
 * The processor only handles known slash commands and leaves other input alone.
 */
export class CliCommandProcessor {
  private readonly logger: CliFileLogger;
  private readonly onExit: () => void;

  /**
   * Creates a command processor with the collaborators it mutates.
   *
   * @param options - Dependencies required to log commands and exit cleanly.
   * @returns A command processor ready to execute slash commands.
   */
  public constructor(options: {
    logger: CliFileLogger;
    onExit: () => void;
  }) {
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
        status: "Shutting down",
      };
    }

    return {
      handled: false,
      status: "Ready",
    };
  }
}
