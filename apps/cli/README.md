# Cortex CLI

Cortex is a terminal interface built to take your cortex back.

It is intentionally anti-information. It removes the extra UI, chatter, and attention traps that make it too easy to keep prompting without thinking. The point is not to surround the model with more panels, indicators, and noise. The point is to make you read the code, review the answer, and decide what actually matters before you ask for more.

The main constraint is forceful timeouts. After the agent responds, Cortex applies a cooldown equal to the time the model just spent generating that response. If the model took 18 seconds to answer, you wait 18 seconds before sending the next prompt. That pause is the product. It is there to break the rapid-fire loop and force a review pass before the next instruction.

Built with Bun, React, and OpenTUI.

## What It Does

- Runs a local terminal UI for chatting with a Cortex agent.
- Starts an agent session scoped to the current working directory.
- Keeps the interface minimal so the response and the code stay the focus.
- Supports the built-in `/exit` command.
- Supports `Ctrl+L` to clear the visible transcript.
- Applies a forceful post-response cooldown equal to the last agent response time.
- Writes session logs to `.cortex/logs` in the directory where you launch it.

## Requirements

- Linux for the installer script.
- [Bun](https://bun.sh).
- The full Cortex repository checkout.

This package depends on local workspace packages such as `@cortex/sdk` and `@cortex/shared`. The launcher is source-based: it runs the CLI from this checkout rather than installing a standalone compiled binary.

## Development

Install dependencies:

```bash
bun install
```

Start the CLI in watch mode:

```bash
bun run dev
```

Run type checking:

```bash
bun run typecheck
```

## Install On Linux

Install the `cortex` command into `~/.local/bin`:

```bash
./install-linux.sh
```

The installer:

- verifies that Bun is installed
- verifies that local Cortex workspace dependencies are available
- creates `~/.local/bin/cortex` as a symlink to this checkout's launcher

If `~/.local/bin` is not already on your `PATH`, add:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

You can also run the installer through Bun:

```bash
bun run install:linux
```

## Usage

After installation:

```bash
cortex
```

Without installing the launcher:

```bash
bun run src/index.tsx
```

## Commands

- `/exit` closes the CLI
- `Ctrl+L` clears the visible transcript

## Logging

Each session writes newline-delimited JSON logs under:

```text
.cortex/logs
```

The log location is relative to the directory where you launch `cortex`.
