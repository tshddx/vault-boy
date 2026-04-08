import { z } from "zod";
import { definePerk, credentialSecretSchema } from "../../task.ts";
import { encryptBeekeeperSecret, loadBeekeeperEncryptionKey } from "./crypto.ts";
import { isBeekeeperDatabaseBusy, updateBeekeeperSavedConnection } from "./database.ts";
import { getBeekeeperPaths } from "./paths.ts";

export const beekeeperPerk = definePerk({
  name: "beekeeper",
  configSchema: z.object({
    connectionName: z.string().min(1),
    secretKey: z.string().min(1),
    appDirectory: z.string().optional(),
  }),
  run({ config, secrets }) {
    const credentials = credentialSecretSchema.parse(secrets[config.secretKey]);
    const paths = getBeekeeperPaths(config.appDirectory);

    if (isBeekeeperDatabaseBusy(paths.databasePath)) {
      throw new Error(
        `Beekeeper appears to be running. Close it before updating ${paths.databasePath}.`,
      );
    }

    const encryptionKey = loadBeekeeperEncryptionKey(paths.keyPath);
    const encryptedPassword = encryptBeekeeperSecret(credentials.password, encryptionKey);

    updateBeekeeperSavedConnection({
      databasePath: paths.databasePath,
      connectionName: config.connectionName,
      username: credentials.username,
      encryptedPassword,
    });
  },
});
