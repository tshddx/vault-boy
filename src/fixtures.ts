import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createEncryptor } from "simple-encryptor";

const BEEKEEPER_BOOTSTRAP_KEY = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B";

export function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeBeekeeperKeyFile(directory: string, encryptionKey: string): string {
  const keyPath = path.join(directory, ".key");
  const encrypted = createEncryptor(BEEKEEPER_BOOTSTRAP_KEY).encrypt({ encryptionKey });
  fs.writeFileSync(keyPath, encrypted, "utf8");
  return keyPath;
}

export function randomEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createBeekeeperDatabase(databasePath: string): void {
  const database = new Database(databasePath);

  try {
    database.exec(`
      CREATE TABLE saved_connection (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        createdAt datetime NOT NULL DEFAULT (datetime('now')),
        updatedAt datetime NOT NULL DEFAULT (datetime('now')),
        version integer NOT NULL,
        connectionType varchar NOT NULL,
        host varchar,
        port integer,
        username varchar,
        defaultDatabase varchar,
        path varchar,
        url varchar,
        uniqueHash varchar(500) NOT NULL,
        name varchar NOT NULL,
        password varchar,
        sshEnabled boolean NOT NULL DEFAULT (0),
        sshHost varchar,
        sshPort integer,
        sshMode varchar(8) NOT NULL DEFAULT ('keyfile'),
        sshKeyfile varchar,
        sshUsername varchar,
        rememberPassword boolean NOT NULL DEFAULT (1),
        rememberSshPassword boolean NOT NULL DEFAULT (1),
        rememberSshKeyfilePassword boolean NOT NULL DEFAULT (1),
        sshKeyfilePassword varchar,
        sshPassword varchar,
        ssl boolean not null default false,
        sshBastionHost varchar(255) default null,
        labelColor varchar(255) default 'default',
        domain varchar(255) default null,
        sslCaFile varchar,
        sslCertFile varchar,
        sslKeyFile varchar,
        sslRejectUnauthorized boolean not null default true,
        workspaceId integer not null default -1,
        trustServerCertificate boolean not null default false,
        socketPathEnabled boolean not null default false,
        socketPath varchar(255) null,
        options text not null default '{}',
        sshKeepaliveInterval int(11) null DEFAULT 60,
        redshiftOptions text not null default '{}',
        cassandraOptions text not null default '{}',
        readOnlyMode boolean not null default false,
        bigQueryOptions text not null default '{}',
        serviceName varchar(255) null default null,
        azureAuthOptions TEXT NOT NULL DEFAULT '{}',
        authId INTEGER NULL,
        libsqlOptions text not null default '{}'
      );
    `);
  } finally {
    database.close();
  }
}
