import path from "node:path";
import process from "node:process";

/**
 * Tracks the directory the CLI should use for agent execution.
 */
export const workingDirectory =
  process.env.CORTEX_LAUNCH_CWD?.trim() || process.cwd();

/**
 * Points to the local directory used for CLI log files.
 */
export const logDirectory = path.join(workingDirectory, ".cortex", "logs");
