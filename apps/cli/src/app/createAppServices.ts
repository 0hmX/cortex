import { createAgentSession, type AgentSession } from "@cortex/sdk";

import { logDirectory, workingDirectory } from "../constants";
import { CliFileLogger } from "../logging/CliFileLogger";

export type CliAppServices = {
  createSession: () => AgentSession;
  logger: CliFileLogger;
};

/**
 * Creates the long-lived services owned by the CLI app shell.
 *
 * @returns Shared collaborators for logging and agent runs.
 */
export function createAppServices(): CliAppServices {
  const logger = new CliFileLogger(logDirectory);

  return {
    createSession: () => createAgentSession({ workingDirectory }),
    logger,
  };
}
