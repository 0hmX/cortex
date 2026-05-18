import path from "node:path";
import { existsSync } from "node:fs";
import process from "node:process";

/**
 * Resolves the working directory used for CLI-triggered agent runs.
 *
 * @returns The preferred workspace root or the current process directory.
 */
function resolveDefaultWorkingDirectory(): string {
  const launchCwd = process.env.CORTEX_LAUNCH_CWD?.trim();
  if (launchCwd) {
    return launchCwd;
  }

  const currentDirectory = process.cwd();
  const workspaceRoot = path.resolve(currentDirectory, "..", "..");
  const workspacePackageJson = path.join(workspaceRoot, "package.json");
  const appPackageJson = path.join(currentDirectory, "package.json");

  if (existsSync(workspacePackageJson) && existsSync(appPackageJson)) {
    return workspaceRoot;
  }

  return currentDirectory;
}

/**
 * Tracks the directory the CLI should use for agent execution.
 */
export const workingDirectory = resolveDefaultWorkingDirectory();

/**
 * Points to the local directory used for CLI log files.
 */
export const logDirectory = path.join(workingDirectory, ".cortex", "logs");
