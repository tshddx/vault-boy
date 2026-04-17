import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { createTempDir } from "../../test-utils.ts";
import { upsertEnvFile } from "./index.ts";

const originalCwd = process.cwd();

describe("env perk helpers", () => {
  beforeEach(() => {
    process.chdir(originalCwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  test("creates a new env file when missing", () => {
    const tempDir = createTempDir("vault-boy-env-");
    const filePath = path.join(tempDir, ".env");

    upsertEnvFile({
      filePath,
      variables: {
        PGHOST: "db.example.com",
        PGPASSWORD: "secret",
        PGPORT: "5432",
        PGUSER: "postgres",
      },
    });

    expect(fs.readFileSync(filePath, "utf8")).toBe(
      'PGHOST="db.example.com"\nPGPASSWORD="secret"\nPGPORT="5432"\nPGUSER="postgres"\n',
    );
  });

  test("updates existing declarations and appends missing ones", () => {
    const tempDir = createTempDir("vault-boy-env-update-");
    const filePath = path.join(tempDir, ".env");
    fs.writeFileSync(filePath, 'PGUSER="old-user"\nKEEP_ME=yes\n', "utf8");

    upsertEnvFile({
      filePath,
      variables: {
        PGHOST: "db.example.com",
        PGPASSWORD: "secret",
        PGPORT: "5432",
        PGUSER: "postgres",
      },
    });

    expect(fs.readFileSync(filePath, "utf8")).toBe(
      'PGUSER="postgres"\nKEEP_ME=yes\n\nPGHOST="db.example.com"\nPGPASSWORD="secret"\nPGPORT="5432"\n',
    );
  });

  test("errors when the existing file is not parseable as env", () => {
    const tempDir = createTempDir("vault-boy-env-invalid-");
    const filePath = path.join(tempDir, ".env");
    fs.writeFileSync(filePath, 'PGUSER="ok"\nnot valid line\n', "utf8");

    expect(() =>
      upsertEnvFile({
        filePath,
        variables: { PGPASSWORD: "secret" },
      }),
    ).toThrow("Unable to parse env file");
  });
});
