import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import Database from "better-sqlite3";

type SavedConnectionRow = {
  id: number;
};

export type BeekeeperConnectionRecord = {
  color?: string;
  connectionType: string;
  defaultDatabase: string;
  encryptedPassword: string;
  host: string;
  label: string;
  port: number;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  username: string;
};

function findSavedConnectionIdByName(
  database: Database.Database,
  connectionName: string,
): number | null {
  const existing = database
    .prepare("SELECT id FROM saved_connection WHERE name = ?")
    .get(connectionName) as SavedConnectionRow | undefined;

  return existing?.id ?? null;
}

function insertSavedConnection(
  database: Database.Database,
  connection: BeekeeperConnectionRecord,
): void {
  database
    .prepare(
      `
        INSERT INTO saved_connection (
          createdAt,
          updatedAt,
          version,
          connectionType,
          host,
          port,
          username,
          defaultDatabase,
          path,
          url,
          uniqueHash,
          name,
          password,
          sshEnabled,
          sshHost,
          sshPort,
          sshMode,
          sshKeyfile,
          sshUsername,
          rememberPassword,
          rememberSshPassword,
          rememberSshKeyfilePassword,
          sshKeyfilePassword,
          sshPassword,
          ssl,
          sshBastionHost,
          labelColor,
          domain,
          sslCaFile,
          sslCertFile,
          sslKeyFile,
          sslRejectUnauthorized,
          workspaceId,
          trustServerCertificate,
          socketPathEnabled,
          socketPath,
          options,
          sshKeepaliveInterval,
          redshiftOptions,
          cassandraOptions,
          readOnlyMode,
          bigQueryOptions,
          serviceName,
          azureAuthOptions,
          authId,
          libsqlOptions
        )
        VALUES (
          datetime('now'),
          datetime('now'),
          7,
          @connectionType,
          @host,
          @port,
          @username,
          @defaultDatabase,
          NULL,
          NULL,
          @uniqueHash,
          @label,
          @encryptedPassword,
          0,
          NULL,
          NULL,
          'keyfile',
          NULL,
          NULL,
          1,
          1,
          1,
          NULL,
          NULL,
          @ssl,
          NULL,
          @labelColor,
          NULL,
          NULL,
          NULL,
          NULL,
          @sslRejectUnauthorized,
          -1,
          0,
          0,
          NULL,
          '{}',
          60,
          '{}',
          '{}',
          0,
          '{}',
          NULL,
          '{}',
          NULL,
          '{}'
        )
      `,
    )
    .run({
      connectionType: connection.connectionType,
      defaultDatabase: connection.defaultDatabase,
      encryptedPassword: connection.encryptedPassword,
      host: connection.host,
      label: connection.label,
      labelColor: connection.color ?? "default",
      port: connection.port,
      ssl: connection.ssl ? 1 : 0,
      sslRejectUnauthorized: connection.sslRejectUnauthorized ? 1 : 0,
      uniqueHash: crypto.randomUUID(),
      username: connection.username,
    });
}

export function isBeekeeperDatabaseBusy(databasePath: string): boolean {
  const paths = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];
  const result = spawnSync("lsof", paths, {
    encoding: "utf8",
    stdio: "pipe",
  });

  return result.status === 0 && result.stdout.trim().length > 0;
}

export function upsertBeekeeperSavedConnection({
  connection,
  databasePath,
}: {
  connection: BeekeeperConnectionRecord;
  databasePath: string;
}): void {
  const database = new Database(databasePath);

  try {
    const existingId = findSavedConnectionIdByName(database, connection.label);

    if (existingId !== null) {
      database
        .prepare(
          "UPDATE saved_connection SET connectionType = ?, host = ?, port = ?, username = ?, defaultDatabase = ?, password = ?, ssl = ?, labelColor = COALESCE(?, labelColor), sslRejectUnauthorized = ?, updatedAt = datetime('now') WHERE id = ?",
        )
        .run(
          connection.connectionType,
          connection.host,
          connection.port,
          connection.username,
          connection.defaultDatabase,
          connection.encryptedPassword,
          connection.ssl ? 1 : 0,
          connection.color ?? null,
          connection.sslRejectUnauthorized ? 1 : 0,
          existingId,
        );

      return;
    }

    insertSavedConnection(database, connection);
  } finally {
    database.close();
  }
}
