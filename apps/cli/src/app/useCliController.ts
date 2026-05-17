import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { KeyEvent } from "@opentui/core";

import { CliCommandProcessor } from "../commands/CliCommandProcessor";
import type { TranscriptEntry } from "../types";
import type { CliAppServices } from "./createAppServices";
import { formatCooldownLabel } from "./formatCooldownLabel";

const COOLDOWN_TICK_MS = 100;

type KeyHandlerLike = {
  off: (eventName: "keypress", listener: (event: KeyEvent) => void) => void;
  on: (eventName: "keypress", listener: (event: KeyEvent) => void) => void;
};

type UseCliControllerOptions = {
  keyHandler: KeyHandlerLike | null | undefined;
  onExit: () => void;
  services: CliAppServices;
};

type CliController = {
  composerHeight: number;
  composerPlaceholder: string;
  composerResetKey: number;
  draft: string;
  entries: TranscriptEntry[];
  isComposerDisabled: boolean;
  statusText: string;
  submitPrompt: (rawValue: string) => Promise<void>;
  updateDraft: (value: string, height: number) => void;
};

/**
 * Owns prompt execution, cooldown timing, command handling, and transcript state.
 *
 * @param options - Shared services and terminal event dependencies.
 * @returns UI-ready state and actions for the CLI shell.
 */
export function useCliController({
  keyHandler,
  onExit,
  services,
}: UseCliControllerOptions): CliController {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Ready");
  const [composerHeight, setComposerHeight] = useState(1);
  const [composerResetKey, setComposerResetKey] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cooldownRemainingMs =
    cooldownUntil === null ? 0 : Math.max(0, cooldownUntil - currentTime);
  const isCoolingDown = cooldownRemainingMs > 0;
  const isComposerDisabled = isSubmitting || isCoolingDown;
  const statusText = isSubmitting
    ? "Agent is responding..."
    : isCoolingDown
      ? `Cooldown active: wait ${formatCooldownLabel(
          cooldownRemainingMs
        )} before the next prompt`
      : status;
  const composerPlaceholder = isSubmitting
    ? "Wait for the current turn to finish"
    : "Message Cortex";

  const resetComposer = useEffectEvent(() => {
    setDraft("");
    setComposerHeight(1);
    setComposerResetKey((value) => value + 1);
    services.logger.logInputValue("");
  });

  const handleCommand = useEffectEvent((rawValue: string) => {
    const processor = new CliCommandProcessor({
      transcriptStore: services.transcriptStore,
      logger: services.logger,
      onExit,
    });
    const result = processor.execute(rawValue);
    if (!result.handled) {
      return false;
    }

    startTransition(() => {
      setEntries(result.entries);
      setStatus(result.status);
    });
    services.logger.logStatus(result.status);

    return true;
  });

  const submitPrompt = useEffectEvent(async (rawValue: string) => {
    const prompt = rawValue.trim();
    if (!prompt) {
      return;
    }

    if (prompt.startsWith("/") && handleCommand(prompt)) {
      resetComposer();
      return;
    }

    if (isComposerDisabled) {
      return;
    }

    resetComposer();
    setEntries(services.transcriptStore.append("user", prompt));
    setStatus("Running...");
    setIsSubmitting(true);
    services.logger.logStatus("Running...");

    const startedAt = Date.now();
    const snapshot = services.gitAutoCommitter.captureSnapshot();

    try {
      const session = services.createSession();
      const result = await session.run(prompt);
      const runDurationMs = Date.now() - startedAt;
      const commitSummary = services.gitAutoCommitter.commitPromptChanges(
        snapshot,
        prompt
      );
      services.logger.logAgentResult(result.output, result.threadId);
      services.logger.logAutoCommitSummary(commitSummary);
      const finalEntries = services.transcriptStore.append(
        "assistant",
        services.gitAutoCommitter.formatSummary(commitSummary)
      );
      const cooldownMessage = `Cooldown started: ${formatCooldownLabel(
        runDurationMs
      )}`;

      startTransition(() => {
        setEntries(finalEntries);
        setStatus("Ready");
        setCurrentTime(Date.now());
        setCooldownUntil(Date.now() + runDurationMs);
      });
      services.logger.logStatus(cooldownMessage);
    } catch (error) {
      const runDurationMs = Date.now() - startedAt;
      const message =
        error instanceof Error ? error.message : "Unknown agent error";
      services.logger.logAgentResult(`Error: ${message}`, null);
      const finalEntries = services.transcriptStore.append(
        "assistant",
        `Error: ${message}`
      );
      const cooldownMessage = `Cooldown started after failure: ${formatCooldownLabel(
        runDurationMs
      )}`;

      startTransition(() => {
        setEntries(finalEntries);
        setStatus("Failed");
        setCurrentTime(Date.now());
        setCooldownUntil(Date.now() + runDurationMs);
      });
      services.logger.logStatus(cooldownMessage);
    } finally {
      setIsSubmitting(false);
    }
  });

  const updateDraft = useEffectEvent((value: string, height: number) => {
    setDraft(value);
    setComposerHeight(height);
    services.logger.logInputValue(value);
  });

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, COOLDOWN_TICK_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isCoolingDown]);

  useEffect(() => {
    if (cooldownUntil === null || cooldownRemainingMs > 0) {
      return;
    }

    setCooldownUntil(null);
    setCurrentTime(Date.now());
    setStatus("Ready");
    services.logger.logStatus("Ready");
  }, [cooldownRemainingMs, cooldownUntil, services.logger]);

  useEffect(() => {
    if (!keyHandler) {
      return;
    }

    const onKeyPress = (event: KeyEvent) => {
      if (!event.ctrl || event.name !== "l") {
        return;
      }

      event.preventDefault();
      const nextEntries = services.transcriptStore.clear("keyboard:ctrl+l");

      startTransition(() => {
        setEntries(nextEntries);
        setStatus("Transcript cleared");
      });
      services.logger.logStatus("Transcript cleared");
    };

    keyHandler.on("keypress", onKeyPress);
    return () => {
      keyHandler.off("keypress", onKeyPress);
    };
  }, [keyHandler, services.logger, services.transcriptStore]);

  useEffect(() => {
    services.logger.logStatus("Ready");

    return () => {
      services.logger.logSessionEnd("renderer_unmount");
    };
  }, [services.logger]);

  return {
    composerHeight,
    composerPlaceholder,
    composerResetKey,
    draft,
    entries,
    isComposerDisabled,
    statusText,
    submitPrompt,
    updateDraft,
  };
}
