import { TextAttributes } from "@opentui/core";

import type { TranscriptEntry } from "../types";
import { COMPOSER_SURFACE_BACKGROUND } from "./ui";

type ConversationPaneProps = {
  entries: TranscriptEntry[];
};

/**
 * Displays the current transcript in a scrollable conversation pane.
 *
 * @param props - Transcript entries to render.
 * @returns The conversation area for the CLI.
 */
export function ConversationPane({ entries }: ConversationPaneProps) {
  return (
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
        <text attributes={TextAttributes.DIM}>Take back your cortex</text>
      ) : (
        entries.map((entry) => (
          <box
            key={entry.id}
            width="100%"
            flexDirection="column"
            marginBottom={1}
            backgroundColor={
              entry.role === "user" ? COMPOSER_SURFACE_BACKGROUND : undefined
            }
            paddingX={entry.role === "user" ? 2 : undefined}
            paddingY={entry.role === "user" ? 1 : undefined}
          >
            <text>{entry.content}</text>
          </box>
        ))
      )}
    </scrollbox>
  );
}
