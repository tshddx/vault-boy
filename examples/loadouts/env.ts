import { z } from "zod";
import { defineLoadout, vaultRead } from "../../src/loadout.ts";
import { envPerk } from "../../src/perks/index.ts";

const secrets = {
  postgres: {
    connection: vaultRead(
      "secret/path/to/example-postgres-config",
      z.object({
        host: z.string(),
        password: z.string(),
        port: z.string(),
        user: z.string(),
      }),
    ),
  },
};

export default defineLoadout({
  secrets,
  perk: envPerk,
  perkConfig: ({ secrets: s }) => ({
    pathname: ".env",
    variables: {
      PGHOST: s.postgres.connection.host,
      PGPASSWORD: s.postgres.connection.password,
      PGPORT: s.postgres.connection.port,
      PGUSER: s.postgres.connection.user,
    },
  }),
});
