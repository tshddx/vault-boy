# vault-boy

`vault-boy` updates local tools from Vault-backed secrets using typed task files.

The first perk updates saved Beekeeper Studio connections in its local SQLite database.

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
vp run vault-boy -- .local/tasks/hadrian.ts
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
- which perk to execute
- callback-based config for that perk using resolved secrets

See `examples/tasks/beekeeper.ts` for a public example.

## Beekeeper perk

The Beekeeper perk creates or updates saved connections in Beekeeper Studio's `app.db`.

For now it only updates:

- `username`
- `password`
- `updatedAt`

When a label already exists, it updates connection settings, credentials, color, and `updatedAt`.

When a label does not exist, it creates a brand new Beekeeper connection from the values in the task.

In task files, configure Beekeeper with `connections[]`, where each connection includes `host` and `defaultDatabase`, and uses resolved secret values from `perkConfig: ({ secrets }) => ({ ... })`. Each connection can also set `color`, `port`, `connectionType`, `ssl`, and `sslRejectUnauthorized`.
