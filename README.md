# vault-boy

`vault-boy` updates local tools from Vault-backed secrets using typed task files.

The first perk updates a saved Beekeeper Studio connection in its local SQLite database.

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
vp run vault-boy -- .local/tasks/prod-atlas.ts
```

Or run a perk directly from command-line arguments:

```bash
vp run vault-boy -- \
  --perk beekeeper \
  --vault-read credentials=env/global/database/prod/static-creds/atlas_admin \
  --connection-name "PROD atlas" \
  --secret-key credentials
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
- typed config for that perk

See `examples/tasks/beekeeper.ts` for a public example.

## Beekeeper perk

The Beekeeper perk updates an existing saved connection in Beekeeper Studio's `app.db`.

For now it only updates:

- `username`
- `password`
- `updatedAt`

It preserves all other connection fields.
