# vault-boy

`vault-boy` fetches secrets from [HashiCorp Vault](https://developer.hashicorp.com/vault) and saves them somewhere useful, such as a `.env` file or a local [Beekeeper Studio](https://www.beekeeperstudio.io/) connection.

## Installation

This project uses [Vite+](https://viteplus.dev/) and its `vp` CLI tool. Follow the [installation instructions](https://viteplus.dev/guide/#install-vp) or run this:

```bash
curl -fsSL https://vite.plus | bash
vp help
```

Install the `vault` CLI by following the [installation instructions](https://developer.hashicorp.com/vault/install), or run this on macOS with Homebrew:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/vault
```

Install project dependencies:

```bash
vp install
```

Create a local `.env` file to specify your Vault URL:

```env
VAULT_ADDR=https://vault.example.com:8200
```

## Running The Tool

Create a loadout definition in a `.ts` file, then run that file with `vp run vault-boy`.

Example command:

```bash
vp run vault-boy -- examples/loadouts/env.ts
```

The bundled `env` example uses fictional Vault paths, so in practice you will usually copy it to a local loadout file and replace the paths with your own.

## Perks

`vault-boy` knows how to fetch secrets from Vault. A perk is a module that tells `vault-boy` how to save or output those resolved secrets.

For perk development details, see [CONTRIBUTING.md](./CONTRIBUTING.md).
