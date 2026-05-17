/**
 * Identifies who produced one transcript message.
 */
export type TranscriptRole = "user" | "assistant";

/**
 * Stores one visible conversation entry in the CLI transcript.
 */
export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  content: string;
};

/**
 * Reports the result of processing a slash command.
 */
export type CommandExecutionResult = {
  handled: boolean;
  entries: TranscriptEntry[];
  status: string;
};
