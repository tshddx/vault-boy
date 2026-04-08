## Plan

1. Bootstrap the repo with Vite+

- Create a Vite+ TypeScript application in the current directory with `vp create vite:application`.
- Keep it as a single-package Node CLI project.
- Use `vp` for package management and task execution.
- Explicitly pin `pnpm` in `package.json` via `packageManager` even though Vite+ can infer it.
- Initialize git and prepare for a public repo named `vault-boy` under `tshddox`.

2. Set up repo defaults for OSS

- Add MIT `LICENSE`.
- Add a `README.md` with:
  - purpose
  - setup
  - auth flow
  - task format
  - Beekeeper example usage
- Add `.gitignore` entries for:
  - `.env`
  - `.local/`
  - `node_modules/`
  - build outputs
  - coverage/temp files

3. Keep private tasks out of git

- Put real local tasks in `.local/tasks/`.
- Store your real task at `.local/tasks/prod-atlas.ts`.
- Commit a generic example instead at `examples/tasks/beekeeper.ts` with no Atlas-specific or company-specific details.

4. Configure Vite+ workflow

- Put project config in `vite.config.ts`.
- Configure `vp check` to run:
  - Oxfmt
  - Oxlint
  - type-aware linting
  - type checking
- Configure `vp test` to run Vitest on `src/**/*.test.ts`.
- Configure `vp run` with a task like `sync` that runs the CLI.
- Require explicit task file usage:
  - `vp run sync -- .local/tasks/prod-atlas.ts`

5. Build the CLI

- Implement a Node CLI entrypoint in TypeScript.
- CLI responsibilities:
  - load `.env`
  - validate required env like `VAULT_ADDR`
  - ensure Vault login
  - load the specified task file
  - fetch secrets from Vault
  - validate task/output config
  - run the chosen output module
  - print a concise result

6. Use Vault CLI for auth and reads

- Keep Vault integration CLI-based since OIDC browser login is already known to work.
- Auth flow:
  - run `vault token lookup >/dev/null 2>&1`
  - if it fails, run `vault login -method=oidc role=default`
  - rerun token lookup
  - if still invalid, fail clearly
- Secret read flow:
  - use `VAULT_ADDR` from env
  - execute `vault read -format=json <path>`
  - parse JSON stdout
  - validate with Zod
- For your real local task, the path is:
  - `env/global/database/prod/static-creds/atlas_admin`

7. Build the task system

- Implement `defineTask()` and `defineOutputModule()` helpers.
- Each task file should declare:
  - which Vault secret(s) to fetch
  - the expected schema for each secret
  - which output module to use
  - typed config for that output module
- Each output module should expose:
  - `configSchema`
  - `run()`

8. Build the Beekeeper output module

- Use the actual local Beekeeper location discovered on this machine:
  - `~/Library/Application Support/beekeeper-studio/app.db`
  - `~/Library/Application Support/beekeeper-studio/.key`
- Reproduce Beekeeper password encryption:
  - decrypt `.key` using Beekeeper’s bootstrap key
  - use that decrypted key with `simple-encryptor`
- Update the `saved_connection` row by connection name.
- For v1, update only:
  - `username`
  - `password`
  - `updatedAt`
- Preserve all other fields.

9. Real local task: `PROD atlas`

- Put the real task in `.local/tasks/prod-atlas.ts`.
- It should:
  - read Vault secret `env/global/database/prod/static-creds/atlas_admin`
  - extract `username` and `password`
  - target Beekeeper connection `PROD atlas`
- Do not overwrite host, port, db name, SSL, or other fields in v1.

10. Public example task

- Add `examples/tasks/beekeeper.ts` showing:
  - env-based `VAULT_ADDR`
  - a generic Vault read
  - Beekeeper output module usage
- Keep it generic and safe for open source.

11. Tests

- Add unit tests for:
  - Vault auth preflight decision logic
  - Vault JSON parsing
  - task config typing/validation
  - Beekeeper `.key` decryption
  - Beekeeper-compatible password encryption
  - SQLite update behavior against a fixture DB copy
- Avoid touching the real Beekeeper DB in tests.

12. Verification workflow

- `vp check`
- `vp test`
- `vp run sync -- .local/tasks/prod-atlas.ts`
- Reopen Beekeeper and verify that `PROD atlas` uses updated credentials.

## Concrete implementation choices

- Vault access: Vault CLI
- Auth bootstrap: automatic OIDC login when token lookup fails
- Env config: `.env`, gitignored, with `VAULT_ADDR`
- Private tasks: `.local/tasks/*`
- Public example: `examples/tasks/beekeeper.ts`
- Beekeeper behavior: update only `username` and `password`

## Recommended command UX

- `vp run sync -- .local/tasks/prod-atlas.ts`
