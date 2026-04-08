# vault-boy

`vault-boy` updates local tools from Vault-backed secrets using typed task files.

The first output module updates a saved Beekeeper Studio connection in its local SQLite database.

## Requirements

- Node 24+
- `vp` installed
- `vault` CLI installed

## Setup

1. Create a local `.env` file:

```env
VAULT_ADDR=https://vault.example.com:8200
```

2. Install dependencies:

```bash
vp install
```

3. Run checks and tests:

```bash
vp check
vp test
```

## Usage

Run an explicit task file with Vite Task:

```bash
vp run sync -- .local/tasks/prod-atlas.ts
```

Private tasks live under `.local/` and are gitignored.

## Vault auth

`vault-boy` checks for a valid Vault session with `vault token lookup`.

If that fails, it automatically runs:

```bash
vault login -method=oidc role=default
```

After login succeeds, it reads the task's configured secrets from Vault.

## Task files

Tasks are regular `.ts` files that export `defineTask(...)`.

They define:

- which Vault paths to read
- the schema expected from each read
- which output module to execute
- typed config for that output module

See `examples/tasks/beekeeper.ts` for a public example.

## Beekeeper output

The Beekeeper output module updates an existing saved connection in Beekeeper Studio's `app.db`.

For now it only updates:

- `username`
- `password`
- `updatedAt`

It preserves all other connection fields.
