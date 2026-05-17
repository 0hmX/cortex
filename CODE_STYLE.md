# Code Style

This repo uses `prettier` as the source of truth for formatting.

## Commands

- Run `bun run fmt` to format the entire repo.
- Run `bun run fmt:check` to verify formatting without changing files.

## File Organization

- Prefer one class or one substantial function per file.
- Group related files into folders and subfolders.
- Keep a file in `src/` only when it does not fit a clearer group.
- Keep entrypoints such as `src/index.ts` or `src/index.tsx` thin.

## Naming

- Use `PascalCase` for classes and React components.
- Use `camelCase` for functions, variables, and helpers.
- Match the filename to the main exported class or function when practical.

## TypeScript

- Prefer explicit exported types for public contracts.
- Keep modules small and focused on one responsibility.
- Use strict typing and avoid widening values unnecessarily.

## JSDoc

- Add JSDoc to each class and substantial function.
- Include `@param` and `@returns` when they apply.
- Add `@remarks` when side effects, ownership, or lifecycle behavior matter.

## Imports

- Keep imports grouped by external packages first, then local modules.
- Use relative imports that reflect the folder structure clearly.

## Comments

- Prefer self-explanatory code over heavy inline commentary.
- Add short comments only when behavior is not obvious from the code itself.
