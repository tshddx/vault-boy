import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createEncryptor } from "simple-encryptor";
import { describe, expect, test } from "vite-plus/test";
import {
  createBeekeeperDatabase,
  createTempDir,
  randomEncryptionKey,
  writeBeekeeperKeyFile,
} from "../../fixtures.ts";
import {
  encryptBeekeeperSecret,
  loadBeekeeperEncryptionKey,
  updateBeekeeperSavedConnection,
} from "./index.ts";

describe("beekeeper perk helpers", () => {
  test("loadBeekeeperEncryptionKey decrypts the key file", () => {
    const tempDir = createTempDir("vault-boy-key-");
    const expectedKey = randomEncryptionKey();
    const keyPath = writeBeekeeperKeyFile(tempDir, expectedKey);

    expect(loadBeekeeperEncryptionKey(keyPath)).toBe(expectedKey);
  });

  test("encryptBeekeeperSecret is compatible with simple-encryptor", () => {
    const encryptionKey = randomEncryptionKey();
    const encrypted = encryptBeekeeperSecret("super-secret", encryptionKey);
    const decrypted = createEncryptor(encryptionKey).decrypt(encrypted);

    expect(decrypted).toBe("super-secret");
  });

  test("updateBeekeeperSavedConnection updates username and password only", () => {
    const tempDir = createTempDir("vault-boy-db-");
    const databasePath = path.join(tempDir, "app.db");
    createBeekeeperDatabase(databasePath);

    const database = new Database(databasePath);
    database
      .prepare(
        `
          INSERT INTO saved_connection (
            version, connectionType, host, port, username, defaultDatabase, uniqueHash, name, password, ssl,
            sslRejectUnauthorized, workspaceId, options, redshiftOptions, cassandraOptions, readOnlyMode,
            bigQueryOptions, azureAuthOptions, libsqlOptions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        7,
        "postgresql",
        "db.example.com",
        5432,
        "old-user",
        "atlas",
        "DEPRECATED",
        "PROD atlas",
        "old-password",
        1,
        1,
        -1,
        "{}",
        "{}",
        "{}",
        0,
        "{}",
        "{}",
        "{}",
      );
    database.close();

    updateBeekeeperSavedConnection({
      databasePath,
      connectionName: "PROD atlas",
      username: "atlas_admin",
      encryptedPassword: "encrypted-password",
    });

    const updatedDatabase = new Database(databasePath, { readonly: true });
    const row = updatedDatabase
      .prepare("SELECT username, password, host, port FROM saved_connection WHERE name = ?")
      .get("PROD atlas") as {
      host: string;
      password: string;
      port: number;
      username: string;
    };
    updatedDatabase.close();

    expect(row).toEqual({
      username: "atlas_admin",
      password: "encrypted-password",
      host: "db.example.com",
      port: 5432,
    });
  });

  test("fixture key file is written to disk", () => {
    const tempDir = createTempDir("vault-boy-fixture-");
    const keyPath = writeBeekeeperKeyFile(tempDir, randomEncryptionKey());

    expect(fs.existsSync(keyPath)).toBe(true);
  });
});
