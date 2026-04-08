import { defineTask, credentialSecretSchema, vaultRead } from "../../src/task.ts";
import { beekeeperPerk } from "../../src/perks/index.ts";

const secrets = {
  credentials: vaultRead("secret/path/to/static-creds/example_user", credentialSecretSchema),
};

export default defineTask({
  secrets,
  perk: beekeeperPerk,
  perkConfig: ({ secrets: s }) => ({
    connections: [
      {
        defaultDatabase: "example_db",
        host: "db.example.com",
        label: "Example Connection",
        username: s.credentials.username,
        password: s.credentials.password,
      },
    ],
  }),
});
