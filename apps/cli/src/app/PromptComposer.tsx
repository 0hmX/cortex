import { useRef } from "react";

import { TextareaRenderable, TextAttributes } from "@opentui/core";

import { createComposerKeyBindings } from "../composer/createComposerKeyBindings";

const MAX_COMPOSER_HEIGHT = 6;
const COMPOSER_KEY_BINDINGS = createComposerKeyBindings();

type PromptComposerProps = {
  composerHeight: number;
  composerResetKey: number;
  draft: string;
  isDisabled: boolean;
  placeholder: string;
  statusText: string;
  onDraftChange: (value: string, height: number) => void;
  onSubmit: (rawValue: string) => Promise<void>;
};

/**
 * Renders the prompt box and translates textarea events into controller actions.
 *
 * @param props - Prompt state and handlers for the CLI composer.
 * @returns The prompt composer pane.
 */
export function PromptComposer({
  composerHeight,
  composerResetKey,
  draft,
  isDisabled,
  placeholder,
  statusText,
  onDraftChange,
  onSubmit,
}: PromptComposerProps) {
  const inputRef = useRef<TextareaRenderable | null>(null);
  const promptBoxHeight = composerHeight + 5;

  return (
    <box
      width="100%"
      height={promptBoxHeight}
      flexDirection="column"
      paddingX={1}
      title="Prompt"
      bottomTitle="Enter to send"
      bottomTitleAlignment="right"
      backgroundColor="#6f6f6f71"
      padding={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <text attributes={isDisabled ? TextAttributes.DIM : TextAttributes.NONE}>
        {statusText}
      </text>
      <text attributes={TextAttributes.DIM}>
        Commands: /help /clear /exit Ctrl+L clear
      </text>
      <textarea
        key={composerResetKey}
        ref={inputRef}
        focused
        width="100%"
        height={composerHeight}
        wrapMode="word"
        keyBindings={COMPOSER_KEY_BINDINGS}
        placeholder={placeholder}
        onContentChange={() => {
          const value = inputRef.current?.plainText ?? "";
          const nextHeight = Math.max(
            1,
            Math.min(MAX_COMPOSER_HEIGHT, inputRef.current?.virtualLineCount ?? 1)
          );

          onDraftChange(value, nextHeight);
        }}
        onSubmit={() => {
          void onSubmit(draft);
        }}
      />
    </box>
  );
}
