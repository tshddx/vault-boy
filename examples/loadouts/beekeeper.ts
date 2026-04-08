import { defineLoadout, credentialSecretSchema, vaultRead } from "../../src/loadout.ts";
import { beekeeperPerk } from "../../src/perks/index.ts";

const secrets = {
  credentials: vaultRead("secret/path/to/static-creds/example_user", credentialSecretSchema),
};

export default defineLoadout({
  secrets,
  perk: beekeeperPerk,
  perkConfig: ({ secrets: s }) => ({
    connections: [
      {
        color: "red",
        defaultDatabase: "example_db",
        host: "db.example.com",
        label: "Example Connection",
        username: s.credentials.username,
        password: s.credentials.password,
      },
    ],
  }),
});
