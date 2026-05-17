import { createAgentSession, type AgentSession } from "@cortex/sdk";

import { logDirectory, workingDirectory } from "../constants";
import { GitAutoCommitter } from "../git/GitAutoCommitter";
import { CliFileLogger } from "../logging/CliFileLogger";
import { TranscriptEntryFactory } from "../transcript/TranscriptEntryFactory";
import { TranscriptStore } from "../transcript/TranscriptStore";

export type CliAppServices = {
  createSession: () => AgentSession;
  gitAutoCommitter: GitAutoCommitter;
  logger: CliFileLogger;
  transcriptStore: TranscriptStore;
};

/**
 * Creates the long-lived services owned by the CLI app shell.
 *
 * @returns Shared collaborators for logging, transcript state, and agent runs.
 */
export function createAppServices(): CliAppServices {
  const logger = new CliFileLogger(logDirectory);

  return {
    createSession: () => createAgentSession({ workingDirectory }),
    gitAutoCommitter: new GitAutoCommitter(workingDirectory),
    logger,
    transcriptStore: new TranscriptStore(new TranscriptEntryFactory(), logger),
  };
}
