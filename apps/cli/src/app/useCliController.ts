import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { KeyEvent } from "@opentui/core";

import { CliCommandProcessor } from "../commands/CliCommandProcessor";
import type { CliAppServices } from "./createAppServices";

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
  draft: string;
  inputHeight: number;
  inputResetKey: number;
  isSubmitting: boolean;
  isPrompting: boolean;
  isShowingResult: boolean;
  output: string;
  resultHint: string;
  promptSummary: string;
  outputTitle: string;
  promptPlaceholder: string;
  pulseFrame: string;
  statusText: string;
  startNewSession: () => void;
  submitPrompt: (rawValue: string) => Promise<void>;
  updateDraft: (value: string, height: number) => void;
};

function isPlainResultKey(event: KeyEvent, key: string): boolean {
  if (event.ctrl || event.meta || event.shift) {
    return false;
  }

  return event.name.toLowerCase() === key;
}

/**
 * Owns prompt execution, command handling, and single-result UI state.
 *
 * @param options - Shared services and terminal event dependencies.
 * @returns UI-ready state and actions for the CLI shell.
 */
export function useCliController({
  keyHandler,
  onExit,
  services,
}: UseCliControllerOptions): CliController {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Ready");
  const [inputHeight, setInputHeight] = useState(1);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState("");
  const [promptSummary, setPromptSummary] = useState("");
  const [outputTitle, setOutputTitle] = useState("Output");
  const [resultHint, setResultHint] = useState(
    "Press n to start a new session. Press q for quit help."
  );
  const [pulseFrameIndex, setPulseFrameIndex] = useState(0);
  const pulseFrames = [".", "..", "..."] as const;
  const pulseFrame: string = pulseFrames[pulseFrameIndex] ?? ".";
  const isPrompting = !isSubmitting && output.trim().length === 0;
  const isShowingResult = !isSubmitting && output.trim().length > 0;
  const statusText = isSubmitting ? `Working${pulseFrame}` : status;
  const promptPlaceholder = isSubmitting
    ? "Cortex is working"
    : "Describe the change. One prompt only.";

  const resetComposer = useEffectEvent(() => {
    setDraft("");
    setInputHeight(1);
    setInputResetKey((value) => value + 1);
    services.logger.logInputValue("");
  });

  const startNewSession = useEffectEvent(() => {
    resetComposer();
    startTransition(() => {
      setOutput("");
      setPromptSummary("");
      setOutputTitle("Output");
      setResultHint("Press n to start a new session. Press q for quit help.");
      setStatus("Ready");
    });
    services.logger.logStatus("Ready");
  });

  const handleCommand = useEffectEvent((rawValue: string) => {
    const processor = new CliCommandProcessor({
      logger: services.logger,
      onExit,
    });
    const result = processor.execute(rawValue);
    if (!result.handled) {
      return false;
    }

    startTransition(() => {
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

    if (isSubmitting) {
      return;
    }

    resetComposer();
    setStatus("Running...");
    setIsSubmitting(true);
    setOutput("");
    setPromptSummary(prompt);
    setOutputTitle("Output");
    setResultHint("Press n to start a new session. Press q for quit help.");
    services.logger.logStatus("Running...");

    try {
      const session = services.createSession();
      const result = await session.run(prompt);
      services.logger.logAgentResult(result.output, result.threadId);

      startTransition(() => {
        setOutput(result.output);
        setOutputTitle("Output");
        setStatus("Ready");
      });
      services.logger.logStatus("Ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown agent error";
      services.logger.logAgentResult(`Error: ${message}`, null);

      startTransition(() => {
        setOutput(`Error: ${message}`);
        setPromptSummary(prompt);
        setOutputTitle("Run Failed");
        setStatus("Failed");
      });
      services.logger.logStatus("Failed");
    } finally {
      setIsSubmitting(false);
    }
  });

  const updateDraft = useEffectEvent((value: string, height: number) => {
    setDraft(value);
    setInputHeight(height);
    services.logger.logInputValue(value);
  });

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const interval = setInterval(() => {
      setPulseFrameIndex((current) => (current + 1) % pulseFrames.length);
    }, 280);

    return () => {
      clearInterval(interval);
    };
  }, [isSubmitting]);

  useEffect(() => {
    if (!keyHandler) {
      return;
    }

    const onKeyPress = (event: KeyEvent) => {
      if (!isShowingResult) {
        return;
      }

      if (isPlainResultKey(event, "n")) {
        event.preventDefault();
        event.stopPropagation();
        services.logger.logShortcut("n");
        startNewSession();
        return;
      }

      if (!isPlainResultKey(event, "q")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      services.logger.logShortcut("q");
      startTransition(() => {
        setResultHint("There is no q shortcut. Type /exit to quit.");
      });
    };

    keyHandler.on("keypress", onKeyPress);
    return () => {
      keyHandler.off("keypress", onKeyPress);
    };
  }, [isShowingResult, keyHandler, services.logger, startNewSession]);

  useEffect(() => {
    services.logger.logStatus("Ready");

    return () => {
      services.logger.logSessionEnd("renderer_unmount");
    };
  }, [services.logger]);

  return {
    draft,
    inputHeight,
    inputResetKey,
    isSubmitting,
    isPrompting,
    isShowingResult,
    output,
    resultHint,
    promptSummary,
    outputTitle,
    promptPlaceholder,
    pulseFrame,
    statusText,
    startNewSession,
    submitPrompt,
    updateDraft,
  };
}
