import { spawnSync } from "node:child_process";
import { z } from "zod";

export type CommandRunnerResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (args: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  inheritStdio?: boolean;
}) => CommandRunnerResult;

export function runCommand({
  command,
  args,
  env,
  inheritStdio = false,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  inheritStdio?: boolean;
}): CommandRunnerResult {
  const result = spawnSync(command, args, {
    env,
    encoding: "utf8",
    stdio: inheritStdio ? "inherit" : "pipe",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function requireVaultAddress(env: NodeJS.ProcessEnv): string {
  const address = env.VAULT_ADDR;

  if (!address) {
    throw new Error("VAULT_ADDR is required. Set it in your environment or .env file.");
  }

  return address;
}

export function hasValidVaultToken(
  env: NodeJS.ProcessEnv,
  runner: CommandRunner = runCommand,
): boolean {
  const result = runner({
    command: "vault",
    args: ["token", "lookup"],
    env,
  });

  return result.status === 0;
}

export function ensureVaultLogin(env: NodeJS.ProcessEnv, runner: CommandRunner = runCommand): void {
  requireVaultAddress(env);

  if (hasValidVaultToken(env, runner)) {
    return;
  }

  const login = runner({
    command: "vault",
    args: ["login", "-method=oidc", "role=default"],
    env,
    inheritStdio: true,
  });

  if (login.status !== 0) {
    throw new Error("Vault login failed.");
  }

  if (!hasValidVaultToken(env, runner)) {
    throw new Error("Vault login completed but no valid Vault session is available.");
  }
}

export function parseVaultRead<TSchema extends z.ZodTypeAny>(
  stdout: string,
  schema: TSchema,
): z.output<TSchema> {
  const parsed = JSON.parse(stdout) as { data?: unknown };
  return schema.parse(parsed.data);
}

export function readVaultSecret<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  env: NodeJS.ProcessEnv,
  runner: CommandRunner = runCommand,
): z.output<TSchema> {
  requireVaultAddress(env);

  const result = runner({
    command: "vault",
    args: ["read", "-format=json", path],
    env,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Vault read failed for ${path}.`);
  }

  return parseVaultRead(result.stdout, schema);
}
