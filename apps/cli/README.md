# Cortex CLI

Cortex is a terminal interface built to take your cortex back.

It is intentionally anti-information. It removes the extra UI, chatter, and attention traps that make it too easy to keep prompting without thinking. The point is not to surround the model with more panels, indicators, and noise. The point is to make you read the code, review the answer, and decide what actually matters before you ask for more.

Built with Bun, React, and OpenTUI.

## What It Does

- Runs a local terminal UI for driving a Cortex agent.
- Starts a fresh agent session for every submitted prompt.
- Shows one centered prompt surface instead of a chat layout.
- Runs the prompt immediately when you press `Enter`.
- Shows the raw agent output directly in a single result pane.
- Lets you quit from the result view with `q`.
- Supports `Ctrl+L` to clear the visible output.
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
./install.sh
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

Show installer help:

```bash
./install.sh --help
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

## Controls

- `q` quits from the result view
- `n` starts a new session from the result view
- `Ctrl+C` exits from the terminal
- `Ctrl+L` clears the visible output

## Logging

Each session writes newline-delimited JSON logs under:

```text
.cortex/logs
```

The log location is relative to the directory where you launch `cortex`.
