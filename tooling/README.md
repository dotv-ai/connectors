# tooling

This repository's own lint, format and CI configuration — the files that make
the public tree buildable and checkable on its own, without the private
monorepo around it.

## What lives here

- `sync.mjs` — the sync engine. It lives here (rather than in the private
  monorepo's `scripts/`) on purpose: it ships with the tree, so the public
  repository can verify itself with `node tooling/sync.mjs --check`.
- `verify-marketplaces.mjs` — checks that every marketplace entry points at a
  directory that exists, that the directory carries the manifest its host
  requires, and that the entry name matches the manifest name.
- `verify-public-tree.mjs` — the gate this tree has to pass before it is
  published: no secrets, no private pointers, no `workspace:` dependencies, no
  binaries, no files outside the allowed layout.
- `set-version.mjs` — copies the version from `version.json` into every
  manifest and package that carries one, and checks that they agree.
- `check-brand-icon.mjs` — checks that the connector's icon is still the DOTV
  logo. The icon is a copy of a generated file, and copies rot; this one is
  caught before anything leaves the private repository.
- The public repository's own workflow, under `.github/workflows/`, which runs
  both of the above.

## Rules

- Keep it minimal. The public tree is small; a heavy toolchain is a maintenance
  cost with nothing to show for it.
- Mirror the source configuration rather than inventing a variant, so a file
  reformatted in the monorepo does not show up as a diff here.
- One implementation per job. The sync engine exists once, here, and is used by
  both repositories.
