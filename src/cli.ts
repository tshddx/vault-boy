import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ensureVaultLogin, readVaultSecret } from "./vault.ts";
import type { SecretDefinitions, TaskDefinition } from "./task.ts";

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

async function main(): Promise<void> {
  const taskPath = process.argv.slice(2).find((arg) => arg !== "--");

  if (!taskPath) {
    throw new Error("Usage: vp run sync -- <task-file>");
  }

  ensureVaultLogin(process.env);
  const task = await loadTask(taskPath);
  const secretEntries = Object.entries(task.secrets) as Array<[string, SecretDefinitions[string]]>;

  const secrets = Object.fromEntries(
    secretEntries.map(([key, definition]) => [
      key,
      readVaultSecret(definition.path, definition.schema, process.env),
    ]),
  );

  const config = task.output.configSchema.parse(task.outputConfig);
  await task.output.run({ config, secrets });

  console.log(`Updated output ${task.output.name} using task ${taskPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
