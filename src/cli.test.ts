import { describe, expect, test } from "vite-plus/test";
import { parseCliArgs } from "./cli.ts";

describe("cli parsing", () => {
  test("parses task-file invocation", () => {
    expect(parseCliArgs(["--", ".local/tasks/prod-atlas.ts"]).mode).toBe("task");
  });

  test("parses perk invocation with kebab-case config flags", () => {
    const invocation = parseCliArgs([
      "--",
      "--perk",
      "beekeeper",
      "--vault-read",
      "credentials=env/global/database/prod/static-creds/atlas_admin",
      "--connection-name",
      "PROD atlas",
      "--secret-key",
      "credentials",
    ]);

    expect(invocation).toMatchObject({
      mode: "perk",
      perkName: "beekeeper",
      perkConfig: {
        connectionName: "PROD atlas",
        secretKey: "credentials",
      },
    });
  });

  test("rejects invalid vault-read syntax", () => {
    expect(() =>
      parseCliArgs(["--", "--perk", "beekeeper", "--vault-read", "credentials"]),
    ).toThrow("Invalid --vault-read value");
  });

  test("requires a perk in command-line mode", () => {
    expect(() => parseCliArgs(["--", "--connection-name", "PROD atlas"])).toThrow(
      "Missing required --perk option",
    );
  });
});
