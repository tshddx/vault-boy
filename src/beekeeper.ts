import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { createEncryptor } from "simple-encryptor";

const BEEKEEPER_BOOTSTRAP_KEY = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B";

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

export function loadBeekeeperEncryptionKey(keyPath: string): string {
  const encrypted = fs.readFileSync(keyPath, "utf8");
  const encryptor = createEncryptor(BEEKEEPER_BOOTSTRAP_KEY);
  const decrypted = encryptor.decrypt(encrypted) as { encryptionKey?: unknown } | null;

  if (!decrypted || typeof decrypted.encryptionKey !== "string") {
    throw new Error(`Unable to decrypt Beekeeper key file at ${keyPath}.`);
  }

  return decrypted.encryptionKey;
}

export function encryptBeekeeperSecret(secret: string, encryptionKey: string): string {
  return createEncryptor(encryptionKey).encrypt(secret);
}

export function isBeekeeperDatabaseBusy(databasePath: string): boolean {
  const paths = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];
  const result = spawnSync("lsof", paths, {
    encoding: "utf8",
    stdio: "pipe",
  });

  return result.status === 0 && result.stdout.trim().length > 0;
}

export function updateBeekeeperSavedConnection({
  databasePath,
  connectionName,
  username,
  encryptedPassword,
}: {
  databasePath: string;
  connectionName: string;
  username: string;
  encryptedPassword: string;
}): void {
  const database = new Database(databasePath);

  try {
    const existing = database
      .prepare("SELECT id FROM saved_connection WHERE name = ?")
      .get(connectionName) as { id: number } | undefined;

    if (!existing) {
      throw new Error(`No Beekeeper saved connection named "${connectionName}" was found.`);
    }

    database
      .prepare(
        "UPDATE saved_connection SET username = ?, password = ?, updatedAt = datetime('now') WHERE id = ?",
      )
      .run(username, encryptedPassword, existing.id);
  } finally {
    database.close();
  }
}
