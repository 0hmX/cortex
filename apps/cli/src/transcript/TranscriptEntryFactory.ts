import type { TranscriptEntry, TranscriptRole } from "../types";

/**
 * Creates transcript entries with stable, unique CLI message ids.
 *
 * @remarks
 * Generated ids combine the role, timestamp, and a short random token.
 */
export class TranscriptEntryFactory {
  /**
   * Creates one transcript entry for the given role and content.
   *
   * @param role - The actor that produced the transcript message.
   * @param content - The plain text content to store in the transcript.
   * @returns A new transcript entry object with a generated id.
   */
  public create(role: TranscriptRole, content: string): TranscriptEntry {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
    };
  }
}
