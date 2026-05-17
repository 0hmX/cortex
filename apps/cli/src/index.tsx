import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
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
  createCliRenderer,
  TextAttributes,
  defaultTextareaKeyBindings,
  type KeyEvent,
} from "@opentui/core";
import { createRoot, useAppContext } from "@opentui/react";

import { createAgentSession, type AgentSession } from "@cortex/sdk";
import { APP_NAME } from "@cortex/shared";

type TranscriptRole = "user" | "assistant";

type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  content: string;
};

type CommandExecutionResult = {
  handled: boolean;
  entries: TranscriptEntry[];
  status: string;
};

const workingDirectory = process.cwd();
const logDirectory = path.join(workingDirectory, ".cortex", "logs");

const HELP_TEXT = [
  "Commands:",
  "/help  Show available commands",
  "/clear Clear the visible transcript",
  "/exit  Exit the CLI",
  "",
  "Editor:",
  "Enter sends",
  "Shift+Enter inserts a new line",
].join("\n");

class CliFileLogger {
  private readonly logFilePath: string;

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

  public getLogFilePath(): string {
    return this.logFilePath;
  }

  public logTranscriptEntry(entry: TranscriptEntry): void {
    this.writeLine("transcript.entry", {
      id: entry.id,
      role: entry.role,
      content: entry.content,
    });
  }

  public logTranscriptCleared(reason: string): void {
    this.writeLine("transcript.cleared", { reason });
  }

  public logCommand(command: string): void {
    this.writeLine("command.executed", { command });
  }

  public logStatus(status: string): void {
    this.writeLine("status.changed", { status });
  }

  public logInputValue(value: string): void {
    this.writeLine("input.changed", { value });
  }
  public logSessionEnd(reason: string): void {
    this.writeLine("session.end", { reason });
  }

  private createTimestampToken(): string {
    return new Date().toISOString().replaceAll(":", "-");
  }

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

class TranscriptEntryFactory {
  public create(role: TranscriptRole, content: string): TranscriptEntry {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
    };
  }
}

class TranscriptStore {
  private readonly entryFactory: TranscriptEntryFactory;
  private readonly logger: CliFileLogger;
  private entries: TranscriptEntry[] = [];

  public constructor(entryFactory: TranscriptEntryFactory, logger: CliFileLogger) {
    this.entryFactory = entryFactory;
    this.logger = logger;
  }

  public append(role: TranscriptRole, content: string): TranscriptEntry[] {
    const entry = this.entryFactory.create(role, content);
    this.entries = [...this.entries, entry];
    this.logger.logTranscriptEntry(entry);
    return this.getEntries();
  }

  public clear(reason: string): TranscriptEntry[] {
    this.entries = [];
    this.logger.logTranscriptCleared(reason);
    return this.getEntries();
  }

  public getEntries(): TranscriptEntry[] {
    return [...this.entries];
  }
}

class CliCommandProcessor {
  private readonly transcriptStore: TranscriptStore;
  private readonly logger: CliFileLogger;
  private readonly onExit: () => void;

  public constructor(options: {
    transcriptStore: TranscriptStore;
    logger: CliFileLogger;
    onExit: () => void;
  }) {
    this.transcriptStore = options.transcriptStore;
    this.logger = options.logger;
    this.onExit = options.onExit;
  }

  public execute(rawValue: string): CommandExecutionResult {
    const command = rawValue.trim().toLowerCase();
    this.logger.logCommand(command);

    if (command === "/help") {
      return {
        handled: true,
        entries: this.transcriptStore.append("assistant", HELP_TEXT),
        status: "Showing help",
      };
    }

    if (command === "/clear") {
      return {
        handled: true,
        entries: this.transcriptStore.clear("command:/clear"),
        status: "Transcript cleared",
      };
    }

    if (command === "/exit") {
      this.onExit();
      return {
        handled: true,
        entries: this.transcriptStore.getEntries(),
        status: "Shutting down",
      };
    }

    return {
      handled: false,
      entries: this.transcriptStore.getEntries(),
      status: "Ready",
    };
  }
}

function App() {
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

  const resetComposer = useEffectEvent(() => {
    setDraft("");
    setComposerHeight(1);
    setComposerResetKey((value) => value + 1);
    loggerRef.current?.logInputValue("");
  });

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
  const composerKeyBindings = [
    ...defaultTextareaKeyBindings.filter(
      (binding) =>
        !(
          (binding.name === "return" || binding.name === "linefeed") &&
          binding.action === "newline"
        ) &&
        !(binding.name === "return" && binding.action === "submit") &&
        !(binding.name === "return" && binding.meta && binding.action === "submit") &&
        !(binding.name === "return" && binding.ctrl && binding.action === "submit")
    ),
    { name: "return", action: "submit" as const },
    { name: "return", shift: true, action: "newline" as const },
    { name: "linefeed", action: "newline" as const },
  ];

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

const renderer = await createCliRenderer({
  clearOnShutdown: true,
  exitOnCtrlC: true,
});

createRoot(renderer).render(<App />);
