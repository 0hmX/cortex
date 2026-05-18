import { useRef } from "react";

import { TextareaRenderable, TextAttributes } from "@opentui/core";

import { createComposerKeyBindings } from "../composer/createComposerKeyBindings";
import {
  COMPOSER_ACCENT,
  COMPOSER_SURFACE_BACKGROUND,
  HERO_MUTED,
} from "./ui";

const MAX_COMPOSER_HEIGHT = 6;
const COMPOSER_KEY_BINDINGS = createComposerKeyBindings();

type PromptComposerProps = {
  draft: string;
  inputHeight: number;
  inputResetKey: number;
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
  draft,
  inputHeight,
  inputResetKey,
  isDisabled,
  placeholder,
  statusText,
  onDraftChange,
  onSubmit,
}: PromptComposerProps) {
  const inputRef = useRef<TextareaRenderable | null>(null);
  const promptBoxHeight = inputHeight + 4;
  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <box
      width="100%"
      height={promptBoxHeight}
      flexDirection="column"
      paddingX={3}
      backgroundColor={COMPOSER_SURFACE_BACKGROUND}
      padding={1}
      onMouseDown={(event) => {
        event.preventDefault();
        focusInput();
      }}
    >
      <text
        fg={COMPOSER_ACCENT}
        attributes={TextAttributes.BOLD}
      >
        One Prompt
      </text>
      <text attributes={isDisabled ? TextAttributes.DIM : TextAttributes.NONE}>
        {isDisabled ? statusText : "Submit once. Review the output. Start a new session."}
      </text>
      <textarea
        key={inputResetKey}
        ref={inputRef}
        focused
        width="100%"
        height={inputHeight}
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
