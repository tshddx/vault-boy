import { z } from "zod";

export type VaultReadDefinition<TSchema extends z.ZodTypeAny> = {
  kind: "vault-read";
  path: string;
  schema: TSchema;
};

export type SecretDefinitions = Record<string, VaultReadDefinition<z.ZodTypeAny>>;

export type PerkModule<TConfigSchema extends z.ZodTypeAny> = {
  name: string;
  configSchema: TConfigSchema;
  run(args: {
    config: z.output<TConfigSchema>;
    secrets: Record<string, unknown>;
  }): Promise<void> | void;
};

export type TaskDefinition<
  TSecrets extends SecretDefinitions,
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
  TSecrets extends SecretDefinitions,
  TPerk extends PerkModule<z.ZodTypeAny>,
>(task: TaskDefinition<TSecrets, TPerk>): TaskDefinition<TSecrets, TPerk> {
  return task;
}

export const credentialSecretSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type CredentialSecret = z.infer<typeof credentialSecretSchema>;
