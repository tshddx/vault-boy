import os from "node:os";
import path from "node:path";

export type BeekeeperPaths = {
  appDirectory: string;
  databasePath: string;
  keyPath: string;
};

export function expandHomePath(input: string): string {
  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

export function getDefaultBeekeeperAppDirectory(): string {
  return path.join(os.homedir(), "Library", "Application Support", "beekeeper-studio");
}

export function getBeekeeperPaths(
  appDirectory = getDefaultBeekeeperAppDirectory(),
): BeekeeperPaths {
  const resolvedAppDirectory = expandHomePath(appDirectory);

  return {
    appDirectory: resolvedAppDirectory,
    databasePath: path.join(resolvedAppDirectory, "app.db"),
    keyPath: path.join(resolvedAppDirectory, ".key"),
  };
}
