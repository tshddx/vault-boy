import { z } from "zod";
import type { ResolvedSecrets, StringLeafPath } from "../../task.ts";
import { definePerk, getValueAtPath } from "../../task.ts";
import { encryptBeekeeperSecret, loadBeekeeperEncryptionKey } from "./crypto.ts";
import { isBeekeeperDatabaseBusy, updateBeekeeperSavedConnection } from "./database.ts";
import { getBeekeeperPaths } from "./paths.ts";

export type BeekeeperConnectionConfig<TSecrets> = {
  label: string;
  username: StringLeafPath<TSecrets>;
  password: StringLeafPath<TSecrets>;
};

export type BeekeeperPerkConfig<TSecretDefinitions> = {
  appDirectory?: string;
  connections: Array<BeekeeperConnectionConfig<ResolvedSecrets<TSecretDefinitions>>>;
};

const beekeeperPerkConfigSchema = z.object({
  appDirectory: z.string().optional(),
  connections: z.array(
    z.object({
      label: z.string().min(1),
      username: z.string().min(1),
      password: z.string().min(1),
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

      updateBeekeeperSavedConnection({
        databasePath: paths.databasePath,
        connectionName: connection.label,
        username,
        encryptedPassword,
      });
    }
  },
});
