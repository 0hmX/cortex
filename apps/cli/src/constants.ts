import path from "node:path";
import process from "node:process";

/**
 * Tracks the directory the CLI should use for agent execution.
 */
export const workingDirectory = process.cwd();

/**
 * Points to the local directory used for CLI log files.
 */
export const logDirectory = path.join(workingDirectory, ".cortex", "logs");

/**
 * Lists the slash commands and editor shortcuts shown to users.
 */
export const HELP_TEXT = [
  "Commands:",
  "/help  Show available commands",
  "/clear Clear the visible transcript",
  "/exit  Exit the CLI",
  "",
  "Editor:",
  "Enter sends",
  "Shift+Enter inserts a new line",
].join("\n");
