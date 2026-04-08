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
  upsertBeekeeperSavedConnection,
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

  test("upsertBeekeeperSavedConnection updates an existing row and color", () => {
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

    upsertBeekeeperSavedConnection({
      connection: {
        color: "orange",
        connectionType: "postgresql",
        defaultDatabase: "atlas",
        encryptedPassword: "encrypted-password",
        host: "db.example.com",
        label: "PROD atlas",
        port: 5432,
        ssl: true,
        sslRejectUnauthorized: true,
        username: "atlas_admin",
      },
      databasePath,
    });

    const updatedDatabase = new Database(databasePath, { readonly: true });
    const row = updatedDatabase
      .prepare(
        "SELECT username, password, host, port, labelColor FROM saved_connection WHERE name = ?",
      )
      .get("PROD atlas") as {
      host: string;
      labelColor: string;
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
      labelColor: "orange",
    });
  });

  test("upsertBeekeeperSavedConnection creates a missing row from explicit config", () => {
    const tempDir = createTempDir("vault-boy-upsert-");
    const databasePath = path.join(tempDir, "app.db");
    createBeekeeperDatabase(databasePath);

    upsertBeekeeperSavedConnection({
      connection: {
        color: "green",
        connectionType: "postgresql",
        defaultDatabase: "atlas",
        encryptedPassword: "new-password",
        host: "db.example.com",
        label: "STAGING atlas (admin)",
        port: 5432,
        ssl: true,
        sslRejectUnauthorized: true,
        username: "atlas_admin",
      },
      databasePath,
    });

    const updatedDatabase = new Database(databasePath, { readonly: true });
    const row = updatedDatabase
      .prepare(
        "SELECT name, username, password, host, port, defaultDatabase, labelColor, uniqueHash FROM saved_connection WHERE name = ?",
      )
      .get("STAGING atlas (admin)") as {
      defaultDatabase: string;
      host: string;
      labelColor: string;
      name: string;
      password: string;
      port: number;
      uniqueHash: string;
      username: string;
    };
    updatedDatabase.close();

    expect(row.name).toBe("STAGING atlas (admin)");
    expect(row.username).toBe("atlas_admin");
    expect(row.password).toBe("new-password");
    expect(row.host).toBe("db.example.com");
    expect(row.port).toBe(5432);
    expect(row.defaultDatabase).toBe("atlas");
    expect(row.labelColor).toBe("green");
    expect(row.uniqueHash.length).toBeGreaterThan(0);
  });

  test("fixture key file is written to disk", () => {
    const tempDir = createTempDir("vault-boy-fixture-");
    const keyPath = writeBeekeeperKeyFile(tempDir, randomEncryptionKey());

    expect(fs.existsSync(keyPath)).toBe(true);
  });
});
