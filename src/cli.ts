import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveSecretDefinitions } from "./loadout.ts";
import { ensureVaultLogin, readVaultSecret } from "./vault.ts";
import type { LoadoutDefinition } from "./loadout.ts";

function getUsage(): string {
  return ["Usage:", "  vp run vault-boy -- <loadout-file>"].join("\n");
}

export function parseCliArgs(args: string[]): string {
  const filteredArgs = args.filter((arg) => arg !== "--");

  if (filteredArgs.length !== 1 || filteredArgs[0]?.startsWith("--")) {
    throw new Error(getUsage());
  }

  return filteredArgs[0];
}

async function loadLoadout(loadoutPath: string): Promise<LoadoutDefinition<any, any, any>> {
  const absoluteLoadoutPath = path.resolve(loadoutPath);
  const imported = (await import(pathToFileURL(absoluteLoadoutPath).href)) as {
    default?: LoadoutDefinition<any, any, any>;
  };

  if (!imported.default) {
    throw new Error(`Loadout file ${absoluteLoadoutPath} must export a default loadout.`);
  }

  return imported.default;
}

async function main(): Promise<void> {
  const loadoutPath = parseCliArgs(process.argv.slice(2));

  ensureVaultLogin(process.env);
  const loadout = await loadLoadout(loadoutPath);
  const secrets = resolveSecretDefinitions(loadout.secrets, (definition) =>
    readVaultSecret(definition.path, definition.schema, process.env),
  );

  const config = loadout.perk.configSchema.parse(loadout.perkConfig({ secrets }));
  await loadout.perk.run({ config, secrets });

  console.log(`Updated perk ${loadout.perk.name} using loadout ${loadoutPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
