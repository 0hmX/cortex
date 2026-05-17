import { useAppContext } from "@opentui/react";

import { ConversationPane } from "./ConversationPane";
import { PromptComposer } from "./PromptComposer";
import { createAppServices } from "./createAppServices";
import { useCliController } from "./useCliController";
import { useSingleton } from "./useSingleton";

/**
 * Renders the terminal chat UI and coordinates prompt execution.
 *
 * @returns The root CLI application tree for the OpenTUI renderer.
 */
export function App() {
  const { keyHandler, renderer } = useAppContext();
  const services = useSingleton(createAppServices);
  const controller = useCliController({
    keyHandler,
    onExit: () => {
      renderer?.destroy();
    },
    services,
  });

  return (
    <box width="100%" height="100%" flexDirection="column">
      <ConversationPane entries={controller.entries} />
      <PromptComposer
        composerHeight={controller.composerHeight}
        composerResetKey={controller.composerResetKey}
        draft={controller.draft}
        isDisabled={controller.isComposerDisabled}
        placeholder={controller.composerPlaceholder}
        statusText={controller.statusText}
        onDraftChange={controller.updateDraft}
        onSubmit={controller.submitPrompt}
      />
    </box>
  );
}
