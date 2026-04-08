import { describe, expect, test } from "vite-plus/test";
import { z } from "zod";
import { defineOutputModule, defineTask, vaultRead } from "./task.ts";

describe("task definitions", () => {
  test("defineTask preserves output config for parsing", () => {
    const output = defineOutputModule({
      name: "test-output",
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
      output,
      outputConfig: {
        name: "demo",
      },
    });

    expect(task.output.configSchema.parse(task.outputConfig)).toEqual({ name: "demo" });
  });
});
