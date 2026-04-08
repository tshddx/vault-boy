import { describe, expect, test, vi } from "vite-plus/test";
import { z } from "zod";
import { ensureVaultLogin, hasValidVaultToken, parseVaultRead, readVaultSecret } from "./vault.ts";

describe("vault helpers", () => {
  test("hasValidVaultToken returns true on success", () => {
    const valid = hasValidVaultToken({ VAULT_ADDR: "https://vault.example.com" }, () => ({
      status: 0,
      stdout: "",
      stderr: "",
    }));

    expect(valid).toBe(true);
  });

  test("ensureVaultLogin runs oidc login when lookup fails", () => {
    const runner = vi
      .fn()
      .mockReturnValueOnce({ status: 2, stdout: "", stderr: "invalid token" })
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" })
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" });

    ensureVaultLogin({ VAULT_ADDR: "https://vault.example.com" }, runner);

    expect(runner).toHaveBeenNthCalledWith(1, {
      command: "vault",
      args: ["token", "lookup"],
      env: { VAULT_ADDR: "https://vault.example.com" },
    });
    expect(runner).toHaveBeenNthCalledWith(2, {
      command: "vault",
      args: ["login", "-method=oidc", "role=default"],
      env: { VAULT_ADDR: "https://vault.example.com" },
      inheritStdio: true,
    });
  });

  test("parseVaultRead validates nested data", () => {
    const value = parseVaultRead(
      JSON.stringify({ data: { username: "atlas_admin", password: "secret" } }),
      z.object({ username: z.string(), password: z.string() }),
    );

    expect(value).toEqual({ username: "atlas_admin", password: "secret" });
  });

  test("readVaultSecret throws on failure", () => {
    expect(() =>
      readVaultSecret(
        "secret/foo",
        z.object({ username: z.string() }),
        { VAULT_ADDR: "https://vault.example.com" },
        () => ({ status: 1, stdout: "", stderr: "permission denied" }),
      ),
    ).toThrow("permission denied");
  });
});
