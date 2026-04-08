import fs from "node:fs";
import { createEncryptor } from "simple-encryptor";

const BEEKEEPER_BOOTSTRAP_KEY = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B";

export function loadBeekeeperEncryptionKey(keyPath: string): string {
  const encrypted = fs.readFileSync(keyPath, "utf8");
  const encryptor = createEncryptor(BEEKEEPER_BOOTSTRAP_KEY);
  const decrypted = encryptor.decrypt(encrypted) as { encryptionKey?: unknown } | null;

  if (!decrypted || typeof decrypted.encryptionKey !== "string") {
    throw new Error(`Unable to decrypt Beekeeper key file at ${keyPath}.`);
  }

  return decrypted.encryptionKey;
}

export function encryptBeekeeperSecret(secret: string, encryptionKey: string): string {
  return createEncryptor(encryptionKey).encrypt(secret);
}
