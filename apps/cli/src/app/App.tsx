import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  TextareaRenderable,
  TextAttributes,
  type KeyEvent,
} from "@opentui/core";
import { useAppContext } from "@opentui/react";

import { createAgentSession, type AgentSession } from "@cortex/sdk";

import { createComposerKeyBindings } from "../composer/createComposerKeyBindings";
import { CliCommandProcessor } from "../commands/CliCommandProcessor";
import { logDirectory, workingDirectory } from "../constants";
import { CliFileLogger } from "../logging/CliFileLogger";
import { TranscriptEntryFactory } from "../transcript/TranscriptEntryFactory";
import { TranscriptStore } from "../transcript/TranscriptStore";
import type { TranscriptEntry } from "../types";

/**
 * Renders the terminal chat UI and coordinates prompt execution.
 *
 * @returns The root CLI application tree for the OpenTUI renderer.
 */
export function App() {
  const { keyHandler, renderer } = useAppContext();
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Ready");
  const [composerHeight, setComposerHeight] = useState(1);
  const [composerResetKey, setComposerResetKey] = useState(0);
  const [isRunning, startRunTransition] = useTransition();
  const inputRef = useRef<TextareaRenderable | null>(null);

  const loggerRef = useRef<CliFileLogger | null>(null);
  if (loggerRef.current === null) {
    loggerRef.current = new CliFileLogger(logDirectory);
  }

  const transcriptStoreRef = useRef<TranscriptStore | null>(null);
  if (transcriptStoreRef.current === null) {
    transcriptStoreRef.current = new TranscriptStore(
      new TranscriptEntryFactory(),
      loggerRef.current
    );
  }

  const sessionRef = useRef<AgentSession | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createAgentSession({ workingDirectory });
  }

  const commandProcessorRef = useRef<CliCommandProcessor | null>(null);
  if (commandProcessorRef.current === null) {
    commandProcessorRef.current = new CliCommandProcessor({
      transcriptStore: transcriptStoreRef.current,
      logger: loggerRef.current,
      onExit: () => {
        renderer?.destroy();
      },
    });
  }

  /**
   * Handles slash commands before prompt submission reaches the agent.
   *
   * @param rawValue - Raw composer text that may represent a slash command.
   * @returns `true` when a command was handled, otherwise `false`.
   */
  const handleCommand = useEffectEvent((rawValue: string) => {
    const result = commandProcessorRef.current?.execute(rawValue);
    if (!result?.handled) {
      return false;
    }

    startTransition(() => {
      setEntries(result.entries);
      setStatus(result.status);
    });
    loggerRef.current?.logStatus(result.status);

    return true;
  });

  /**
   * Clears the prompt composer after a send or command action.
   *
   * @returns Nothing.
   */
  const resetComposer = useEffectEvent(() => {
    setDraft("");
    setComposerHeight(1);
    setComposerResetKey((value) => value + 1);
    loggerRef.current?.logInputValue("");
  });

  /**
   * Sends a prompt, appends transcript entries, and updates the UI state.
   *
   * @param rawValue - Raw composer text to normalize and submit.
   * @returns A promise that resolves after submission work has been scheduled.
   */
  const submitPrompt = useEffectEvent(async (rawValue: string) => {
    const prompt = rawValue.trim();
    if (!prompt || isRunning) {
      return;
    }

    if (prompt.startsWith("/") && handleCommand(prompt)) {
      resetComposer();
      return;
    }

    resetComposer();
    const nextEntries = transcriptStoreRef.current?.append("user", prompt) ?? [];
    setEntries(nextEntries);
    setStatus("Running...");
    loggerRef.current?.logStatus("Running...");

    setTimeout(() => {
      startRunTransition(async () => {
        try {
          const result = await sessionRef.current!.run(prompt);
          const finalEntries =
            transcriptStoreRef.current?.append("assistant", result.output) ?? [];

          startTransition(() => {
            setEntries(finalEntries);
            setStatus("Ready");
          });
          loggerRef.current?.logStatus("Ready");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown agent error";
          const finalEntries =
            transcriptStoreRef.current?.append("assistant", `Error: ${message}`) ?? [];

          startTransition(() => {
            setEntries(finalEntries);
            setStatus("Failed");
          });
          loggerRef.current?.logStatus("Failed");
        }
      });
    }, 0);
  });

  useEffect(() => {
    if (!keyHandler) {
      return;
    }

    const onKeyPress = (event: KeyEvent) => {
      if (!event.ctrl || event.name !== "l") {
        return;
      }

      event.preventDefault();
      const nextEntries =
        transcriptStoreRef.current?.clear("keyboard:ctrl+l") ?? [];

      startTransition(() => {
        setEntries(nextEntries);
        setStatus("Transcript cleared");
      });
      loggerRef.current?.logStatus("Transcript cleared");
    };

    keyHandler.on("keypress", onKeyPress);
    return () => {
      keyHandler.off("keypress", onKeyPress);
    };
  }, [keyHandler]);

  useEffect(() => {
    loggerRef.current?.logStatus("Ready");
    return () => {
      loggerRef.current?.logSessionEnd("renderer_unmount");
    };
  }, []);

  const promptBoxHeight = composerHeight + 5;
  const composerKeyBindings = createComposerKeyBindings();

  return (
    <box width="100%" height="100%" flexDirection="column">
      <scrollbox
        width="100%"
        flexGrow={1}
        padding={1}
        scrollY
        stickyScroll
        stickyStart="bottom"
        title="Conversation"
      >
        {entries.length === 0 ? (
          <text attributes={TextAttributes.DIM}>
            Take back your cortex
          </text>
        ) : (
          entries.map((entry) => (
            <box key={entry.id} width="100%" flexDirection="column" marginBottom={1}>
              <text>{entry.content}</text>
            </box>
          ))
        )}
      </scrollbox>

      <box
        width="100%"
        height={promptBoxHeight}
        flexDirection="column"
        paddingX={1}
        title="Prompt"
        bottomTitle="Enter to send"
        bottomTitleAlignment="right"
        backgroundColor={"#6f6f6f71"}
        padding={1}
        paddingLeft={2}
        paddingRight={2}
      >
        <text attributes={isRunning ? TextAttributes.DIM : TextAttributes.NONE}>
          {isRunning ? "Agent is responding..." : status}
        </text>
        <text attributes={TextAttributes.DIM}>
          Commands: /help  /clear  /exit  Ctrl+L clear
        </text>
        <textarea
          key={composerResetKey}
          ref={inputRef}
          focused
          width="100%"
          height={composerHeight}
          wrapMode="word"
          keyBindings={composerKeyBindings}
          placeholder={isRunning ? "Wait for the current turn to finish" : "Message Cortex"}
          onContentChange={() => {
            const value = inputRef.current?.plainText ?? "";
            const nextHeight = Math.max(
              1,
              Math.min(6, inputRef.current?.virtualLineCount ?? 1)
            );
            setDraft(value);
            setComposerHeight(nextHeight);
            loggerRef.current?.logInputValue(value);
          }}
          onSubmit={() => {
            void submitPrompt(inputRef.current?.plainText ?? draft);
          }}
        />
      </box>
    </box>
  );
}
