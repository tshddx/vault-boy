import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { definePerk, defineTask, vaultRead } from "./task.ts";

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
});
