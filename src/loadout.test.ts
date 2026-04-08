import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { defineLoadout, definePerk, resolveSecretDefinitions, vaultRead } from "./loadout.ts";

describe("loadout definitions", () => {
  test("defineLoadout resolves callback-based perk config", () => {
    const perk = definePerk({
      name: "test-perk",
      configSchema: z.object({
        name: z.string(),
      }),
      run() {},
    });

    const loadout = defineLoadout({
      secrets: {
        credentials: vaultRead(
          "secret/example",
          z.object({ username: z.string(), password: z.string() }),
        ),
      },
      perk,
      perkConfig: ({ secrets }) => ({
        name: secrets.credentials.username,
      }),
    });

    const secrets = resolveSecretDefinitions(loadout.secrets, (definition) =>
      definition.schema.parse({ username: "demo", password: "secret" }),
    );

    expect(loadout.perk.configSchema.parse(loadout.perkConfig({ secrets }))).toEqual({
      name: "demo",
    });
  });

  test("resolveSecretDefinitions supports nested secret trees", () => {
    const secrets = resolveSecretDefinitions(
      {
        prod: {
          atlas: vaultRead(
            "secret/example",
            z.object({ username: z.string(), password: z.string() }),
          ),
        },
      },
      (definition) => definition.schema.parse({ username: "atlas_admin", password: "secret" }),
    );

    expect(secrets.prod.atlas.username).toBe("atlas_admin");
  });
});
