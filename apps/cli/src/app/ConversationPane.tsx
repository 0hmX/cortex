import { TextAttributes } from "@opentui/core";

import type { TranscriptEntry } from "../types";

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
          >
            <text>{entry.content}</text>
          </box>
        ))
      )}
    </scrollbox>
  );
}
