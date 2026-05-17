import { execFileSync } from "node:child_process";

export type GitSnapshot = {
  dirtyPaths: Set<string>;
  isGitRepository: boolean;
};

export type AutoCommitSummary = {
  commitHash: string | null;
  commitMessage: string | null;
  filesAdded: number;
  filesDeleted: number;
  filesModified: number;
  skippedDirtyPaths: string[];
  status: "committed" | "no_changes" | "not_git_repo";
};

type GitStatusEntry = {
  path: string;
  originalPath: string | null;
  statusCode: string;
};

const AUTO_COMMIT_PREFIX = "CORTEX_AUTOCOMMIT";

/**
 * Captures worktree state and creates machine-detectable auto commits.
 */
export class GitAutoCommitter {
  private readonly workingDirectory: string;

  /**
   * Creates a git automation helper scoped to one working directory.
   *
   * @param workingDirectory - Directory where git commands should run.
   * @returns A helper that snapshots and commits prompt changes.
   */
  public constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Captures the set of dirty paths that existed before a prompt run started.
   *
   * @returns A snapshot used later to isolate safe auto-commit paths.
   */
  public captureSnapshot(): GitSnapshot {
    if (!this.isGitRepository()) {
      return {
        dirtyPaths: new Set<string>(),
        isGitRepository: false,
      };
    }

    const dirtyPaths = new Set<string>();

    for (const entry of this.readStatusEntries()) {
      dirtyPaths.add(entry.path);
      if (entry.originalPath) {
        dirtyPaths.add(entry.originalPath);
      }
    }

    return {
      dirtyPaths,
      isGitRepository: true,
    };
  }

  /**
   * Stages and commits prompt-created changes while avoiding pre-existing dirty paths.
   *
   * @param snapshot - Baseline worktree snapshot collected before the prompt run.
   * @param prompt - User prompt used to derive a stable auto-commit message suffix.
   * @returns A summary of what was committed, or why no commit happened.
   */
  public commitPromptChanges(
    snapshot: GitSnapshot,
    prompt: string
  ): AutoCommitSummary {
    if (!snapshot.isGitRepository || !this.isGitRepository()) {
      return {
        commitHash: null,
        commitMessage: null,
        filesAdded: 0,
        filesDeleted: 0,
        filesModified: 0,
        skippedDirtyPaths: [],
        status: "not_git_repo",
      };
    }

    const currentEntries = this.readStatusEntries();
    const safePaths = new Set<string>();
    const skippedDirtyPaths = new Set<string>();

    for (const entry of currentEntries) {
      const relatedPaths = [entry.path];
      if (entry.originalPath) {
        relatedPaths.push(entry.originalPath);
      }

      const touchesDirtyPath = relatedPaths.some((path) =>
        snapshot.dirtyPaths.has(path)
      );

      if (touchesDirtyPath) {
        for (const path of relatedPaths) {
          if (snapshot.dirtyPaths.has(path)) {
            skippedDirtyPaths.add(path);
          }
        }
        continue;
      }

      for (const path of relatedPaths) {
        safePaths.add(path);
      }
    }

    if (safePaths.size === 0) {
      return {
        commitHash: null,
        commitMessage: null,
        filesAdded: 0,
        filesDeleted: 0,
        filesModified: 0,
        skippedDirtyPaths: [...skippedDirtyPaths].sort(),
        status: "no_changes",
      };
    }

    const pathspecs = [...safePaths].sort();
    this.runGit(["add", "-A", "--", ...pathspecs]);

    const stagedEntries = this.readDiffNameStatusEntries(pathspecs);
    if (stagedEntries.length === 0) {
      return {
        commitHash: null,
        commitMessage: null,
        filesAdded: 0,
        filesDeleted: 0,
        filesModified: 0,
        skippedDirtyPaths: [...skippedDirtyPaths].sort(),
        status: "no_changes",
      };
    }

    const commitMessage = this.buildCommitMessage(prompt);
    this.runGit(["commit", "-m", commitMessage, "--", ...pathspecs]);

    return {
      commitHash: this.runGit(["rev-parse", "HEAD"]).trim(),
      commitMessage,
      filesAdded: this.countStatuses(stagedEntries, "A"),
      filesDeleted: this.countStatuses(stagedEntries, "D"),
      filesModified:
        stagedEntries.length -
        this.countStatuses(stagedEntries, "A") -
        this.countStatuses(stagedEntries, "D"),
      skippedDirtyPaths: [...skippedDirtyPaths].sort(),
      status: "committed",
    };
  }

  /**
   * Formats a user-facing summary that replaces the hidden model response.
   *
   * @param summary - Auto-commit result to render in the transcript.
   * @returns A compact summary string for the UI transcript.
   */
  public formatSummary(summary: AutoCommitSummary): string {
    if (summary.status === "not_git_repo") {
      return "No commit created. Working directory is not a git repository.";
    }

    if (summary.status === "no_changes") {
      return this.appendSkippedDirtyPaths(
        "No commit created. No new clean file changes were detected.",
        summary.skippedDirtyPaths
      );
    }

    const base = [
      `Commit ${summary.commitHash}`,
      `files added ${summary.filesAdded}`,
      `files deleted ${summary.filesDeleted}`,
      `files modified ${summary.filesModified}`,
    ].join(" | ");

    return this.appendSkippedDirtyPaths(base, summary.skippedDirtyPaths);
  }

  /**
   * Exposes the machine-readable commit prefix for callers and docs.
   *
   * @returns The fixed prefix used for auto-generated commit messages.
   */
  public static getAutoCommitPrefix(): string {
    return AUTO_COMMIT_PREFIX;
  }

  private appendSkippedDirtyPaths(
    message: string,
    skippedDirtyPaths: string[]
  ): string {
    if (skippedDirtyPaths.length === 0) {
      return message;
    }

    const preview = skippedDirtyPaths.slice(0, 3).join(", ");
    const suffix =
      skippedDirtyPaths.length > 3
        ? `${preview}, +${skippedDirtyPaths.length - 3} more`
        : preview;

    return `${message} | skipped pre-existing dirty paths: ${suffix}`;
  }

  private buildCommitMessage(prompt: string): string {
    const timestamp = new Date().toISOString();
    const slug = prompt
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
      .slice(0, 48);

    return `${AUTO_COMMIT_PREFIX}: ${timestamp} :: ${slug || "session-change"}`;
  }

  private countStatuses(entries: GitStatusEntry[], code: string): number {
    return entries.filter((entry) => entry.statusCode.startsWith(code)).length;
  }

  private isGitRepository(): boolean {
    try {
      this.runGit(["rev-parse", "--is-inside-work-tree"]);
      return true;
    } catch {
      return false;
    }
  }

  private readStatusEntries(): GitStatusEntry[] {
    const output = this.runGit([
      "status",
      "--short",
      "--untracked-files=all",
    ]);
    if (!output.trim()) {
      return [];
    }

    return output
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => this.parseStatusLine(line));
  }

  private readDiffNameStatusEntries(pathspecs: string[]): GitStatusEntry[] {
    const output = this.runGit([
      "diff",
      "--cached",
      "--name-status",
      "--",
      ...pathspecs,
    ]);
    if (!output.trim()) {
      return [];
    }

    return output
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => this.parseDiffNameStatusLine(line));
  }

  private parseStatusLine(line: string): GitStatusEntry {
    const statusCode = line.slice(0, 2).trim() || "M";
    const rawPath = line.slice(3).trim();

    if (rawPath.includes(" -> ")) {
      const [originalPath, path] = rawPath.split(" -> ");
      return {
        path: path ?? rawPath,
        originalPath: originalPath ?? null,
        statusCode,
      };
    }

    return {
      path: rawPath,
      originalPath: null,
      statusCode,
    };
  }

  private parseDiffNameStatusLine(line: string): GitStatusEntry {
    const [statusCode, ...pathParts] = line.split("\t");
    const originalPath =
      pathParts.length > 1 ? (pathParts[0] ?? null) : null;
    const path = pathParts.length > 1 ? pathParts[1] : pathParts[0];

    return {
      path: path ?? "",
      originalPath,
      statusCode: statusCode ?? "M",
    };
  }

  private runGit(args: string[]): string {
    return execFileSync("git", args, {
      cwd: this.workingDirectory,
      encoding: "utf8",
    });
  }
}
