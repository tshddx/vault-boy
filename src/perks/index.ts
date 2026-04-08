import { beekeeperPerk } from "./beekeeper/index.ts";

export const perkRegistry = {
  beekeeper: beekeeperPerk,
} as const;

export { beekeeperPerk };
