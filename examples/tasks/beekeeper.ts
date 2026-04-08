import { defineTask, credentialSecretSchema, vaultRead } from "../../src/task.ts";
import type { BeekeeperPerkConfig } from "../../src/perks/beekeeper/perk.ts";
import { beekeeperPerk } from "../../src/perks/index.ts";

const secrets = {
  credentials: vaultRead("secret/path/to/static-creds/example_user", credentialSecretSchema),
};

export default defineTask({
  secrets,
  perk: beekeeperPerk,
  perkConfig: {
    connections: [
      {
        defaultDatabase: "example_db",
        host: "db.example.com",
        label: "Example Connection",
        username: "credentials.username",
        password: "credentials.password",
      },
    ],
  } satisfies BeekeeperPerkConfig<typeof secrets>,
});
