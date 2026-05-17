import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "./app/App";

/**
 * Boots the terminal renderer and mounts the CLI application.
 */
const renderer = await createCliRenderer({
  clearOnShutdown: true,
  exitOnCtrlC: true,
});

createRoot(renderer).render(<App />);
