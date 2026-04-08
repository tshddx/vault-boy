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
  TConfigSchema extends z.ZodTypeAny,
  TPerk extends PerkModule<TConfigSchema>,
> = {
  secrets: TSecrets;
  perk: TPerk;
  perkConfig(args: { secrets: ResolvedSecrets<TSecrets> }): z.input<TConfigSchema>;
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
  TConfigSchema extends z.ZodTypeAny,
  TPerk extends PerkModule<TConfigSchema>,
>(
  task: TaskDefinition<TSecrets, TConfigSchema, TPerk>,
): TaskDefinition<TSecrets, TConfigSchema, TPerk> {
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

export const credentialSecretSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type CredentialSecret = z.infer<typeof credentialSecretSchema>;
