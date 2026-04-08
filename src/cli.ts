import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { perkRegistry } from "./perks/index.ts";
import { credentialSecretSchema, vaultRead } from "./task.ts";
import { ensureVaultLogin, readVaultSecret } from "./vault.ts";
import { resolveSecretDefinitions } from "./task.ts";
import type { SecretDefinitionTree, TaskDefinition } from "./task.ts";

type TaskInvocation = {
  mode: "task";
  taskPath: string;
};

type PerkInvocation = {
  mode: "perk";
  perkName: keyof typeof perkRegistry;
  secrets: SecretDefinitionTree;
  perkConfig: Record<string, string>;
};

type Invocation = PerkInvocation | TaskInvocation;

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());
}

function getUsage(): string {
  return [
    "Usage:",
    "  vp run vault-boy -- <task-file>",
    "  vp run vault-boy -- --perk <name> --vault-read <key>=<path> [perk-flags]",
  ].join("\n");
}

export function parseCliArgs(args: string[]): Invocation {
  const filteredArgs = args.filter((arg) => arg !== "--");

  if (filteredArgs.length === 0) {
    throw new Error(getUsage());
  }

  if (!filteredArgs[0]?.startsWith("--")) {
    return {
      mode: "task",
      taskPath: filteredArgs[0],
    };
  }

  let perkName: keyof typeof perkRegistry | undefined;
  const perkConfig: Record<string, string> = {};
  const secrets: SecretDefinitionTree = {};

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index];

    if (!arg?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const optionName = arg.slice(2);
    const optionValue = filteredArgs[index + 1];

    if (!optionValue || optionValue.startsWith("--")) {
      throw new Error(`Missing value for --${optionName}`);
    }

    index += 1;

    if (optionName === "perk") {
      if (!(optionValue in perkRegistry)) {
        throw new Error(`Unknown perk: ${optionValue}`);
      }

      perkName = optionValue as keyof typeof perkRegistry;
      continue;
    }

    if (optionName === "vault-read") {
      const separatorIndex = optionValue.indexOf("=");

      if (separatorIndex <= 0 || separatorIndex === optionValue.length - 1) {
        throw new Error(`Invalid --vault-read value: ${optionValue}`);
      }

      const key = optionValue.slice(0, separatorIndex);
      const vaultPath = optionValue.slice(separatorIndex + 1);
      secrets[key] = vaultRead(vaultPath, credentialSecretSchema);
      continue;
    }

    perkConfig[toCamelCase(optionName)] = optionValue;
  }

  if (!perkName) {
    throw new Error(`Missing required --perk option.\n\n${getUsage()}`);
  }

  return {
    mode: "perk",
    perkName,
    secrets,
    perkConfig,
  };
}

async function loadTask(taskPath: string): Promise<TaskDefinition<any, any>> {
  const absoluteTaskPath = path.resolve(taskPath);
  const imported = (await import(pathToFileURL(absoluteTaskPath).href)) as {
    default?: TaskDefinition<any, any>;
  };

  if (!imported.default) {
    throw new Error(`Task file ${absoluteTaskPath} must export a default task.`);
  }

  return imported.default;
}

async function resolveTask(invocation: Invocation): Promise<TaskDefinition<any, any>> {
  if (invocation.mode === "task") {
    return loadTask(invocation.taskPath);
  }

  return {
    secrets: invocation.secrets,
    perk: perkRegistry[invocation.perkName],
    perkConfig: invocation.perkConfig,
  };
}

async function main(): Promise<void> {
  const invocation = parseCliArgs(process.argv.slice(2));

  ensureVaultLogin(process.env);
  const task = await resolveTask(invocation);
  const secrets = resolveSecretDefinitions(task.secrets, (definition) =>
    readVaultSecret(definition.path, definition.schema, process.env),
  );

  const config = task.perk.configSchema.parse(task.perkConfig);
  await task.perk.run({ config, secrets });

  const summary =
    invocation.mode === "task" ? `task ${invocation.taskPath}` : "command-line options";
  console.log(`Updated perk ${task.perk.name} using ${summary}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
