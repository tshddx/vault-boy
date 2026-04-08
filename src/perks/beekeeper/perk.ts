import { z } from "zod";
import type { ResolvedSecrets, StringLeafPath } from "../../task.ts";
import { definePerk, getValueAtPath } from "../../task.ts";
import { encryptBeekeeperSecret, loadBeekeeperEncryptionKey } from "./crypto.ts";
import { isBeekeeperDatabaseBusy, upsertBeekeeperSavedConnection } from "./database.ts";
import { getBeekeeperPaths } from "./paths.ts";

export type BeekeeperConnectionConfig<TSecrets> = {
  color?: string;
  connectionType?: string;
  defaultDatabase: string;
  host: string;
  label: string;
  port?: number;
  username: StringLeafPath<TSecrets>;
  password: StringLeafPath<TSecrets>;
  ssl?: boolean;
  sslRejectUnauthorized?: boolean;
};

export type BeekeeperPerkConfig<TSecretDefinitions> = {
  appDirectory?: string;
  connections: Array<BeekeeperConnectionConfig<ResolvedSecrets<TSecretDefinitions>>>;
};

const beekeeperPerkConfigSchema = z.object({
  appDirectory: z.string().optional(),
  connections: z.array(
    z.object({
      color: z.string().min(1).optional(),
      connectionType: z.string().min(1).optional(),
      defaultDatabase: z.string().min(1),
      host: z.string().min(1),
      label: z.string().min(1),
      port: z.number().int().positive().optional(),
      username: z.string().min(1),
      password: z.string().min(1),
      ssl: z.boolean().optional(),
      sslRejectUnauthorized: z.boolean().optional(),
    }),
  ),
});

export const beekeeperPerk = definePerk({
  name: "beekeeper",
  configSchema: beekeeperPerkConfigSchema,
  run({ config, secrets }) {
    const paths = getBeekeeperPaths(config.appDirectory);

    if (isBeekeeperDatabaseBusy(paths.databasePath)) {
      throw new Error(
        `Beekeeper appears to be running. Close it before updating ${paths.databasePath}.`,
      );
    }

    const encryptionKey = loadBeekeeperEncryptionKey(paths.keyPath);

    for (const connection of config.connections) {
      const username = getValueAtPath(secrets, connection.username);
      const password = getValueAtPath(secrets, connection.password);

      if (typeof username !== "string") {
        throw new Error(`Path "${connection.username}" did not resolve to a string username.`);
      }

      if (typeof password !== "string") {
        throw new Error(`Path "${connection.password}" did not resolve to a string password.`);
      }

      const encryptedPassword = encryptBeekeeperSecret(password, encryptionKey);

      upsertBeekeeperSavedConnection({
        databasePath: paths.databasePath,
        connection: {
          color: connection.color,
          connectionType: connection.connectionType ?? "postgresql",
          defaultDatabase: connection.defaultDatabase,
          encryptedPassword,
          host: connection.host,
          label: connection.label,
          port: connection.port ?? 5432,
          ssl: connection.ssl ?? true,
          sslRejectUnauthorized: connection.sslRejectUnauthorized ?? true,
          username,
        },
      });
    }
  },
});
