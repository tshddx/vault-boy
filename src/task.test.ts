import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { definePerk, defineTask, resolveSecretDefinitions, vaultRead } from "./task.ts";

describe("task definitions", () => {
  test("defineTask resolves callback-based perk config", () => {
    const perk = definePerk({
      name: "test-perk",
      configSchema: z.object({
        name: z.string(),
      }),
      run() {},
    });

    const task = defineTask({
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

    const secrets = resolveSecretDefinitions(task.secrets, (definition) =>
      definition.schema.parse({ username: "demo", password: "secret" }),
    );

    expect(task.perk.configSchema.parse(task.perkConfig({ secrets }))).toEqual({ name: "demo" });
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
