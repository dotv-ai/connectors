# Contributing

The front page of this repository describes what the connectors do. This page
describes how the repository is put together — read it before changing
anything.

## Source of truth

The source of truth is the private `dotv` monorepo, at `packages/connectors/`.
A workflow in that repository mirrors the tree here on every merge: it checks
the tree against the gate, pushes it to the `sync/connectors` branch, opens a
pull request, and lets this repository's own CI merge it once it is green.

So: change the tree in the monorepo, not here. Changes made directly in this
repository are caught by the manifest check and overwritten by the next sync.

## Layout

| Path                               | What it is                                                               |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `.agents/plugins/marketplace.json` | The Codex marketplace index                                              |
| `.claude-plugin/marketplace.json`  | The Claude Code marketplace index                                        |
| `plugins/dotv-canvas/`             | One marketplace entry, with a manifest per host                          |
| `plugins/*/skills/`                | The wording an agent reads — harness-neutral by rule                     |
| `bundles/`                         | Hosts that install a plugin as a package rather than a marketplace entry |
| `tooling/`                         | The scripts this repository uses on itself                               |
| `version.json`                     | The version number, and the only place it is written by hand             |

## Rules

**Capabilities go through MCP or HTTP.** No host SDK, no host-private API, no
DOTV internals in the shared parts. This tree describes DOTV's _public
behaviour_. A new host needs a manifest, not new code.

**No `workspace:` dependencies.** The tree has to install on its own. Shared
code is bundled in at build time or reached over MCP — never through a
workspace protocol.

**Host names never reach the top level.** `bundles/` groups by packaging form;
the host name sits one level deeper, next to the files that host's format
actually requires.

**Wording is about the task, not the transport.** "Read the canvas", "run a
generation" — not "call the MCP tool with these arguments". If a sentence has
to name a host, it belongs in that host's own file.

## The gates

Four checks run in this repository's CI, and the first two also run in the
private repository _before_ anything is pushed — a branch in a public repository
is public, so pushing is publishing.

| Gate                              | What it rejects                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tooling/sync.mjs --check`        | The tree drifting away from its sync manifest                                                    |
| `tooling/verify-public-tree.mjs`  | Secrets, private pointers, `workspace:` dependencies, binaries, files outside the allowed layout |
| `tooling/verify-marketplaces.mjs` | A marketplace entry pointing at nothing, or a name that disagrees with its manifest              |
| `tooling/set-version.mjs --check` | A version number that disagrees between `version.json` and the manifests                         |

## Versions and releases

`version.json` is the only place a version is written by hand.
`tooling/set-version.mjs` copies it into every manifest and package that
carries one.

When a new version reaches `main` here, CI tags it and publishes: the npm
packages for the bundles (with provenance), a tarball per bundle for installers
that would otherwise need build approval, and a GitHub Release holding both.
Nothing needs to be clicked.

Two paths, two jobs, deliberately apart: the npm one needs a trusted publisher
configured on the package (`dotv-ai` / `connectors` / `release.yml` / environment
`connectors`), and until that is set it fails on the one-time 2FA npm asks for
on a package's first publish. The tarball path does not depend on npm at all, so
the bundle stays installable either way:

```sh
dsh plugin --profile demo add \
  https://github.com/dotv-ai/connectors/releases/latest/download/dotv-dsh-canvas.tgz
```

The asset name carries no version on purpose: `releases/latest/download/` takes
the filename literally, so a versioned name would 404 the moment the next
release lands.
