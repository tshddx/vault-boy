import { z } from "zod";

export type VaultReadDefinition<TSchema extends z.ZodTypeAny> = {
  kind: "vault-read";
  path: string;
  schema: TSchema;
};

export type SecretDefinitions = Record<string, VaultReadDefinition<z.ZodTypeAny>>;

export type OutputModule<TConfigSchema extends z.ZodTypeAny> = {
  name: string;
  configSchema: TConfigSchema;
  run(args: {
    config: z.output<TConfigSchema>;
    secrets: Record<string, unknown>;
  }): Promise<void> | void;
};

export type TaskDefinition<
  TSecrets extends SecretDefinitions,
  TOutput extends OutputModule<z.ZodTypeAny>,
> = {
  secrets: TSecrets;
  output: TOutput;
  outputConfig: z.input<TOutput["configSchema"]>;
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

export function defineOutputModule<TConfigSchema extends z.ZodTypeAny>(
  module: OutputModule<TConfigSchema>,
): OutputModule<TConfigSchema> {
  return module;
}

export function defineTask<
  TSecrets extends SecretDefinitions,
  TOutput extends OutputModule<z.ZodTypeAny>,
>(task: TaskDefinition<TSecrets, TOutput>): TaskDefinition<TSecrets, TOutput> {
  return task;
}

export const credentialSecretSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type CredentialSecret = z.infer<typeof credentialSecretSchema>;
