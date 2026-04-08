import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { definePerk } from "../../loadout.ts";

const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const envAssignmentPattern = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

function assertParsableEnvFile(content: string, filePath: string): void {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    if (!envAssignmentPattern.test(line)) {
      throw new Error(`Unable to parse env file at ${filePath}. Unsupported line: ${line}`);
    }
  }

  dotenv.parse(content);
}

function formatEnvAssignment(key: string, value: string): string {
  return `${key}=${JSON.stringify(value)}`;
}

export function upsertEnvFile({
  filePath,
  variables,
}: {
  filePath: string;
  variables: Record<string, string>;
}): void {
  if (Object.keys(variables).length === 0) {
    return;
  }

  if (!fs.existsSync(filePath)) {
    const content = `${Object.entries(variables)
      .map(([key, value]) => formatEnvAssignment(key, value))
      .join("\n")}\n`;
    fs.writeFileSync(filePath, content, "utf8");
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");
  assertParsableEnvFile(original, filePath);

  const updatedKeys = new Set<string>();
  const updatedLines = original.split(/\r?\n/).flatMap((line) => {
    const match = envAssignmentPattern.exec(line);

    if (!match) {
      return [line];
    }

    const key = match[1];
    const nextValue = variables[key];

    if (nextValue === undefined) {
      return [line];
    }

    if (updatedKeys.has(key)) {
      return [];
    }

    updatedKeys.add(key);
    return [formatEnvAssignment(key, nextValue)];
  });

  const missingAssignments = Object.entries(variables)
    .filter(([key]) => !updatedKeys.has(key))
    .map(([key, value]) => formatEnvAssignment(key, value));

  const finalLines = [...updatedLines];

  if (missingAssignments.length > 0) {
    if (finalLines.length > 0 && finalLines.at(-1) !== "") {
      finalLines.push("");
    }

    finalLines.push(...missingAssignments);
  }

  fs.writeFileSync(filePath, `${finalLines.join("\n")}\n`, "utf8");
}

export const envPerk = definePerk({
  name: "env",
  configSchema: z.object({
    pathname: z.string().min(1).default(".env"),
    variables: z.record(z.string().regex(envKeyPattern), z.string()),
  }),
  run({ config }) {
    const filePath = path.resolve(process.cwd(), config.pathname);
    upsertEnvFile({
      filePath,
      variables: config.variables,
    });
  },
});
