import { defaultTextareaKeyBindings } from "@opentui/core";

/**
 * Builds composer bindings so Enter submits and Shift+Enter inserts a line.
 *
 * @returns A textarea key binding list tailored for the CLI prompt composer.
 */
export function createComposerKeyBindings() {
  return [
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
}
