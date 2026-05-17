import { CliFileLogger } from "../logging/CliFileLogger";
import type { TranscriptEntry, TranscriptRole } from "../types";
import { TranscriptEntryFactory } from "./TranscriptEntryFactory";

/**
 * Owns the in-memory transcript and mirrors mutations to the logger.
 *
 * @remarks
 * The store returns defensive copies so callers cannot mutate internal state.
 */
export class TranscriptStore {
  private readonly entryFactory: TranscriptEntryFactory;
  private readonly logger: CliFileLogger;
  private entries: TranscriptEntry[] = [];

  /**
   * Creates a transcript store with entry creation and logging dependencies.
   *
   * @param entryFactory - Factory used to create unique transcript entries.
   * @param logger - Logger that records transcript mutations to disk.
   * @returns A transcript store with empty initial state.
   */
  public constructor(
    entryFactory: TranscriptEntryFactory,
    logger: CliFileLogger
  ) {
    this.entryFactory = entryFactory;
    this.logger = logger;
  }

  /**
   * Appends one message and returns the latest transcript snapshot.
   *
   * @param role - The actor that produced the new transcript message.
   * @param content - The text content to append to the transcript.
   * @returns A snapshot of the transcript after the append operation.
   */
  public append(role: TranscriptRole, content: string): TranscriptEntry[] {
    const entry = this.entryFactory.create(role, content);
    this.entries = [...this.entries, entry];
    this.logger.logTranscriptEntry(entry);
    return this.getEntries();
  }

  /**
   * Clears the transcript and returns the empty snapshot.
   *
   * @param reason - Machine-readable reason for the clear operation.
   * @returns An empty transcript snapshot after the clear operation.
   */
  public clear(reason: string): TranscriptEntry[] {
    this.entries = [];
    this.logger.logTranscriptCleared(reason);
    return this.getEntries();
  }

  /**
   * Returns a defensive copy of the current transcript.
   *
   * @returns A new array containing the current transcript entries.
   */
  public getEntries(): TranscriptEntry[] {
    return [...this.entries];
  }
}
