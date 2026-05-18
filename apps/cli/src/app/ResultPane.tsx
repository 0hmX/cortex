import { TextAttributes } from "@opentui/core";

import { COMPOSER_SURFACE_BACKGROUND, HERO_MUTED } from "./ui";

type ResultPaneProps = {
  content: string;
  footerMessage?: string;
  isSubmitting: boolean;
  pulseFrame: string;
  promptSummary: string;
  title: string;
};

/**
 * Displays the latest agent output without rendering a conversation history.
 *
 * @param props - Latest output state for the single-result workspace.
 * @returns A scrollable output panel.
 */
export function ResultPane({
  content,
  footerMessage,
  isSubmitting,
  pulseFrame,
  promptSummary,
  title,
}: ResultPaneProps) {
  const body = isSubmitting ? `Generating${pulseFrame}` : content;

  return (
    <box
      width="100%"
      flexGrow={1}
      minHeight={8}
      backgroundColor={COMPOSER_SURFACE_BACKGROUND}
      flexDirection="column"
      padding={1}
    >
      <text fg={HERO_MUTED} attributes={TextAttributes.BOLD}>
        {title}
      </text>
      {promptSummary ? <text fg={HERO_MUTED}>Prompt: {promptSummary}</text> : null}
      <scrollbox width="100%" flexGrow={1} scrollY stickyScroll stickyStart="top">
        <text>{body}</text>
      </scrollbox>
      {!isSubmitting && footerMessage ? <text fg={HERO_MUTED}>{footerMessage}</text> : null}
    </box>
  );
}
