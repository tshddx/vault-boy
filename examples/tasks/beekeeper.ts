import { defineTask, credentialSecretSchema, vaultRead } from "../../src/task.ts";
import { beekeeperPerk } from "../../src/perks/index.ts";

export default defineTask({
  secrets: {
    credentials: vaultRead("secret/path/to/static-creds/example_user", credentialSecretSchema),
  },
  perk: beekeeperPerk,
  perkConfig: {
    connectionName: "Example Connection",
    secretKey: "credentials",
  },
});
