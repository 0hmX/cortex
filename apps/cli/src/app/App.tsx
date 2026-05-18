import { useAppContext } from "@opentui/react";

import { PromptComposer } from "./PromptComposer";
import { ResultPane } from "./ResultPane";
import { createAppServices } from "./createAppServices";
import { COMPOSER_ACCENT, HERO_MUTED } from "./ui";
import { useCliController } from "./useCliController";
import { useSingleton } from "./useSingleton";

/**
 * Renders the terminal single-prompt UI and coordinates prompt execution.
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

  const composerProps = {
    draft: controller.draft,
    inputHeight: controller.inputHeight,
    inputResetKey: controller.inputResetKey,
    isDisabled: controller.isSubmitting,
    placeholder: controller.promptPlaceholder,
    statusText: controller.statusText,
    onDraftChange: controller.updateDraft,
    onSubmit: controller.submitPrompt,
  };

  if (controller.isPrompting) {
    return (
      <box
        width="100%"
        height="100%"
        flexDirection="column"
        paddingX={12}
        paddingY={3}
        justifyContent="center"
      >
        <box width="100%" flexDirection="column" alignItems="center">
          <text fg={COMPOSER_ACCENT}>Prompt once. Then inspect the diff.</text>
          <text fg={HERO_MUTED}>No chat. Use `Ctrl+N` after the result to start over.</text>
          <box width="100%" maxWidth={88} marginTop={2}>
            <PromptComposer {...composerProps} />
          </box>
        </box>
      </box>
    );
  }

  if (controller.isSubmitting) {
    return (
      <box
        width="100%"
        height="100%"
        flexDirection="column"
        paddingX={12}
        paddingY={3}
        justifyContent="center"
      >
        <box width="100%" flexDirection="column" alignItems="center">
          <text fg={COMPOSER_ACCENT}>Running prompt</text>
          <text fg={HERO_MUTED}>{controller.promptSummary}</text>
          <box width="100%" maxWidth={88} marginTop={2}>
            <ResultPane
              content={controller.output}
              isSubmitting={controller.isSubmitting}
              promptSummary=""
              pulseFrame={controller.pulseFrame}
              title="Diff"
            />
          </box>
        </box>
      </box>
    );
  }

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      paddingX={4}
      paddingY={2}
      justifyContent="flex-start"
    >
      <box width="100%" height="100%" flexDirection="column">
        <box width="100%" flexDirection="column">
          <text fg={COMPOSER_ACCENT}>Result</text>
          <text fg={HERO_MUTED}>This run is finished. Start a new session for the next prompt.</text>
        </box>
        <box width="100%" flexGrow={1} marginTop={1}>
          <ResultPane
            content={controller.output}
            isSubmitting={controller.isSubmitting}
            promptSummary={controller.promptSummary}
            pulseFrame={controller.pulseFrame}
            title={controller.outputTitle}
          />
        </box>
      </box>
    </box>
  );
}
