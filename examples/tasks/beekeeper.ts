import { defineTask, credentialSecretSchema, vaultRead } from "../../src/task.ts";
import { beekeeperOutput } from "../../src/outputs/beekeeper.ts";

export default defineTask({
  secrets: {
    credentials: vaultRead("secret/path/to/static-creds/example_user", credentialSecretSchema),
  },
  output: beekeeperOutput,
  outputConfig: {
    connectionName: "Example Connection",
    secretKey: "credentials",
  },
});
