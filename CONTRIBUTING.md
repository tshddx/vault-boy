# Contributing

A perk is a module that tells `vault-boy` how to save or output secrets fetched from Vault.

If you are using an LLM to help implement a perk, point it at `src/perks/env/perk.ts` first (or just point it at this document). That file is the best small reference implementation in the repo.

## Adding A New Perk

Put new perk files under `src/perks/<name>/`.

Typical layout:

```text
src/perks/<name>/perk.ts
src/perks/<name>/index.ts
src/perks/<name>/perk.test.ts
```

Add more helper files in that folder when the perk needs them.

### Required exports

In `src/perks/<name>/perk.ts`, export the perk itself:

```ts
export const myPerk = definePerk({
  name: "my-perk",
  configSchema: z.object({ ... }),
  run({ config, secrets }) {
    ...
  },
})
```

In `src/perks/<name>/index.ts`, re-export the public pieces for that perk.

Then add the perk to `src/perks/chart.ts`.

## How The Perk Chart Works

There is no dynamic perk discovery.

`src/perks/chart.ts` is the project's perk chart. Loadout files import perks from there:

```ts
import { envPerk } from "../../src/perks/chart.ts";
```

So when you add a new perk:

1. implement it under `src/perks/<name>/`
2. export it from `src/perks/<name>/index.ts`
3. re-export it from `src/perks/chart.ts`

That keeps the public import surface simple and predictable.

## Loadout Authoring Model

Loadout files define two things:

1. `secrets`
2. `perkConfig`

`secrets` describes what to fetch from Vault:

```ts
const secrets = {
  postgres: {
    connection: vaultRead("secret/path", z.object({ user: z.string() })),
  },
};
```

`perkConfig` is a callback that receives the resolved secrets:

```ts
perkConfig: ({ secrets: s }) => ({
  variables: {
    PGUSER: s.postgres.connection.user,
  },
});
```

This is the preferred pattern:

- Zod defines the config shape
- loadout files use real resolved values
- perks do not need special secret-path parsing logic

## Testing And Verification

For a new perk, add focused unit tests near the perk.

At minimum, test:

1. happy-path writes/updates
2. error handling for malformed input or unsupported state
3. any file or database mutation behavior

Before opening a PR, run:

```bash
vp check
vp test
```

If the perk is backed by a real local integration, add a public example loadout under `examples/loadouts/` that shows the intended usage pattern with fictional secret paths.

## Env Perk Walkthrough

The `env` perk lives in `src/perks/env/perk.ts`. It saves secrets from Vault into a local .env file.

The main pieces to look at are:

1. `configSchema`

```ts
configSchema: z.object({
  pathname: z.string().min(1).default(".env"),
  variables: z.record(z.string().regex(envKeyPattern), z.string()),
});
```

This is the perk's public interface. Keep this schema as the single source of truth for config shape.

2. `assertParsableEnvFile()`

```ts
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
```

This is the guardrail that makes updates safe. The perk refuses to modify a file it cannot confidently parse.

3. `upsertEnvFile()`

```ts
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
```

This is the core update behavior:

- keep unrelated lines
- replace requested variables in place
- drop duplicate declarations for the same managed key
- append missing variables at the end

4. `run()`

```ts
run({ config }) {
  const filePath = path.resolve(process.cwd(), config.pathname)
  upsertEnvFile({ filePath, variables: config.variables })
}
```

Keep `run()` small. Put the actual logic into helpers that are easy to test.
