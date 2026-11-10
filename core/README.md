# core

The harness-neutral part: the wording an agent reads, and anything that describes
what the agent can do rather than how a host is wired.

## What belongs here

- Tool semantics: what each command means, what it needs, what it returns.
- Prompt and skill text that is not tied to one host's UI or file layout.
- Any asset shared by more than one packaging form.

## What does not belong here

- Host manifests, plugin entries, slash-command wiring — those live in
  `plugins/` and `bundles/`.
- Anything that names a specific host in the sentence an agent reads. If a
  sentence has to say "in Codex click …", it is host-specific by definition.
- Product internals. The canvas implementation is closed source and lives in the
  DOTV monorepo; `core/` describes its public behavior, not its code.

## The rule that keeps this useful

Write it once, in the vocabulary of the task ("read the canvas", "run a
generation"), not in the vocabulary of the transport ("call the MCP tool with
these arguments"). A host-specific detail belongs in the host's own file, and a
host that has no file for it yet is a sign the detail was not neutral.
