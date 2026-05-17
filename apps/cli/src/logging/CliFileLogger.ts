import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { APP_NAME } from "@cortex/shared";

import { workingDirectory } from "../constants";
import type { TranscriptEntry } from "../types";

/**
 * Persists CLI activity as newline-delimited JSON log events.
 *
 * @remarks
 * Each public method emits one structured event into the current session log.
 */
export class CliFileLogger {
  private readonly logFilePath: string;

  /**
   * Creates the log directory and opens a session log file.
   *
   * @param baseDirectory - Directory where CLI log files should be written.
   * @returns A logger bound to a new session log file.
   */
  public constructor(baseDirectory: string) {
    mkdirSync(baseDirectory, { recursive: true });
    this.logFilePath = path.join(
      baseDirectory,
      `cli-${this.createTimestampToken()}-${process.pid}.log`
    );
    this.writeLine("session.start", {
      appName: APP_NAME,
      cwd: workingDirectory,
      pid: process.pid,
    });
  }

  /**
   * Returns the full path of the active log file.
   *
   * @returns The absolute or relative path of the current session log file.
   */
  public getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Stores one transcript entry in the session log.
   *
   * @param entry - The transcript entry to serialize into the log stream.
   * @returns Nothing.
   */
  public logTranscriptEntry(entry: TranscriptEntry): void {
    this.writeLine("transcript.entry", {
      id: entry.id,
      role: entry.role,
      content: entry.content,
    });
  }

  /**
   * Records that the transcript was cleared and why.
   *
   * @param reason - Short machine-readable reason for the clear action.
   * @returns Nothing.
   */
  public logTranscriptCleared(reason: string): void {
    this.writeLine("transcript.cleared", { reason });
  }

  /**
   * Records a handled slash command invocation.
   *
   * @param command - Normalized slash command text that was executed.
   * @returns Nothing.
   */
  public logCommand(command: string): void {
    this.writeLine("command.executed", { command });
  }

  /**
   * Records a user-facing status change.
   *
   * @param status - The status string shown in the CLI prompt area.
   * @returns Nothing.
   */
  public logStatus(status: string): void {
    this.writeLine("status.changed", { status });
  }

  /**
   * Records the current textarea content for debugging.
   *
   * @param value - The latest prompt composer text.
   * @returns Nothing.
   */
  public logInputValue(value: string): void {
    this.writeLine("input.changed", { value });
  }

  /**
   * Marks the end of the current CLI session.
   *
   * @param reason - Short reason describing why the session ended.
   * @returns Nothing.
   */
  public logSessionEnd(reason: string): void {
    this.writeLine("session.end", { reason });
  }

  /**
   * Builds a filename-safe ISO timestamp token.
   *
   * @returns A timestamp string that is safe to embed in filenames.
   */
  private createTimestampToken(): string {
    return new Date().toISOString().replaceAll(":", "-");
  }

  /**
   * Appends one structured event line to the active log file.
   *
   * @param event - Event name written into the JSON log record.
   * @param payload - Additional event data merged into the log record.
   * @returns Nothing.
   */
  private writeLine(event: string, payload: Record<string, unknown>): void {
    appendFileSync(
      this.logFilePath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...payload,
      })}\n`,
      "utf8"
    );
  }
}
