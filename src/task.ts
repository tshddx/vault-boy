import { z } from "zod";

export type VaultReadDefinition<TSchema extends z.ZodTypeAny> = {
  kind: "vault-read";
  path: string;
  schema: TSchema;
};

export type SecretDefinitionNode = VaultReadDefinition<z.ZodTypeAny> | SecretDefinitionTree;

export type SecretDefinitionTree = {
  [key: string]: SecretDefinitionNode;
};

export type ResolvedSecrets<TDefinition> =
  TDefinition extends VaultReadDefinition<infer TSchema>
    ? z.output<TSchema>
    : TDefinition extends Record<string, SecretDefinitionNode>
      ? {
          [TKey in keyof TDefinition]: ResolvedSecrets<TDefinition[TKey]>;
        }
      : never;

type DotJoin<TPrefix extends string, TSuffix extends string> = `${TPrefix}.${TSuffix}`;

export type StringLeafPath<TValue> = TValue extends object
  ? {
      [TKey in Extract<keyof TValue, string>]: TValue[TKey] extends string
        ? TKey
        : TValue[TKey] extends object
          ? DotJoin<TKey, StringLeafPath<TValue[TKey]>>
          : never;
    }[Extract<keyof TValue, string>]
  : never;

export type PerkModule<TConfigSchema extends z.ZodTypeAny> = {
  name: string;
  configSchema: TConfigSchema;
  run(args: {
    config: z.output<TConfigSchema>;
    secrets: Record<string, unknown>;
  }): Promise<void> | void;
};

export type TaskDefinition<
  TSecrets extends SecretDefinitionTree,
  TPerk extends PerkModule<z.ZodTypeAny>,
> = {
  secrets: TSecrets;
  perk: TPerk;
  perkConfig: z.input<TPerk["configSchema"]>;
};

export function vaultRead<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
): VaultReadDefinition<TSchema> {
  return {
    kind: "vault-read",
    path,
    schema,
  };
}

export function definePerk<TConfigSchema extends z.ZodTypeAny>(
  module: PerkModule<TConfigSchema>,
): PerkModule<TConfigSchema> {
  return module;
}

export function defineTask<
  TSecrets extends SecretDefinitionTree,
  TPerk extends PerkModule<z.ZodTypeAny>,
>(task: TaskDefinition<TSecrets, TPerk>): TaskDefinition<TSecrets, TPerk> {
  return task;
}

export function isVaultReadDefinition(
  value: SecretDefinitionNode,
): value is VaultReadDefinition<z.ZodTypeAny> {
  return (
    typeof value === "object" && value !== null && "kind" in value && value.kind === "vault-read"
  );
}

export function resolveSecretDefinitions<TDefinition extends SecretDefinitionTree>(
  definitions: TDefinition,
  resolveVaultRead: <TSchema extends z.ZodTypeAny>(
    definition: VaultReadDefinition<TSchema>,
  ) => z.output<TSchema>,
): ResolvedSecrets<TDefinition> {
  const resolvedEntries = Object.entries(definitions).map(([key, value]) => {
    if (isVaultReadDefinition(value)) {
      return [key, resolveVaultRead(value)];
    }

    return [key, resolveSecretDefinitions(value, resolveVaultRead)];
  });

  return Object.fromEntries(resolvedEntries) as ResolvedSecrets<TDefinition>;
}

export function getValueAtPath(target: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      throw new Error(`Path "${path}" was not found in the resolved secrets.`);
    }

    return (current as Record<string, unknown>)[segment];
  }, target);
}

export const credentialSecretSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type CredentialSecret = z.infer<typeof credentialSecretSchema>;
