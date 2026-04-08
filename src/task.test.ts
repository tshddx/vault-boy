import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import {
  definePerk,
  defineTask,
  getValueAtPath,
  resolveSecretDefinitions,
  vaultRead,
} from "./task.ts";
import type { ResolvedSecrets, StringLeafPath } from "./task.ts";

describe("task definitions", () => {
  test("defineTask preserves perk config for parsing", () => {
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
      perkConfig: {
        name: "demo",
      },
    });

    expect(task.perk.configSchema.parse(task.perkConfig)).toEqual({ name: "demo" });
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

  test("getValueAtPath resolves dotted paths", () => {
    expect(
      getValueAtPath({ credentials: { username: "atlas_admin" } }, "credentials.username"),
    ).toBe("atlas_admin");
  });

  test("string leaf paths allow string leaves only", () => {
    const definitions = {
      credentials: vaultRead(
        "secret/example",
        z.object({ username: z.string(), password: z.string() }),
      ),
    };

    type Secrets = ResolvedSecrets<typeof definitions>;

    const usernamePath: StringLeafPath<Secrets> = "credentials.username";

    // @ts-expect-error invalid secret path should fail type checking
    const invalidPath: StringLeafPath<Secrets> = "credentials.token";

    expect(usernamePath).toBe("credentials.username");
    expect(invalidPath).toBe("credentials.token");
  });
});
