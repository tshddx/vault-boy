import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveSecretDefinitions } from "./task.ts";
import { ensureVaultLogin, readVaultSecret } from "./vault.ts";
import type { TaskDefinition } from "./task.ts";

function getUsage(): string {
  return ["Usage:", "  vp run vault-boy -- <task-file>"].join("\n");
}

export function parseCliArgs(args: string[]): string {
  const filteredArgs = args.filter((arg) => arg !== "--");

  if (filteredArgs.length !== 1 || filteredArgs[0]?.startsWith("--")) {
    throw new Error(getUsage());
  }

  return filteredArgs[0];
}

async function loadTask(taskPath: string): Promise<TaskDefinition<any, any, any>> {
  const absoluteTaskPath = path.resolve(taskPath);
  const imported = (await import(pathToFileURL(absoluteTaskPath).href)) as {
    default?: TaskDefinition<any, any, any>;
  };

  if (!imported.default) {
    throw new Error(`Task file ${absoluteTaskPath} must export a default task.`);
  }

  return imported.default;
}

async function main(): Promise<void> {
  const taskPath = parseCliArgs(process.argv.slice(2));

  ensureVaultLogin(process.env);
  const task = await loadTask(taskPath);
  const secrets = resolveSecretDefinitions(task.secrets, (definition) =>
    readVaultSecret(definition.path, definition.schema, process.env),
  );

  const config = task.perk.configSchema.parse(task.perkConfig({ secrets }));
  await task.perk.run({ config, secrets });

  console.log(`Updated perk ${task.perk.name} using task ${taskPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
