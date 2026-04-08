import { z } from "zod";
import { definePerk } from "../../loadout.ts";
import { encryptBeekeeperSecret, loadBeekeeperEncryptionKey } from "./crypto.ts";
import { isBeekeeperDatabaseBusy, upsertBeekeeperSavedConnection } from "./database.ts";
import { getBeekeeperPaths } from "./paths.ts";

export const beekeeperLabelColors = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type BeekeeperLabelColor = (typeof beekeeperLabelColors)[number];

const beekeeperPerkConfigSchema = z.object({
  appDirectory: z.string().optional(),
  connections: z.array(
    z.object({
      color: z.enum(beekeeperLabelColors).optional(),
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
  run({ config }) {
    const paths = getBeekeeperPaths(config.appDirectory);

    if (isBeekeeperDatabaseBusy(paths.databasePath)) {
      throw new Error(
        `Beekeeper appears to be running. Close it before updating ${paths.databasePath}.`,
      );
    }

    const encryptionKey = loadBeekeeperEncryptionKey(paths.keyPath);

    for (const connection of config.connections) {
      const encryptedPassword = encryptBeekeeperSecret(connection.password, encryptionKey);

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
          username: connection.username,
        },
      });
    }
  },
});
