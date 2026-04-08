import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

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
