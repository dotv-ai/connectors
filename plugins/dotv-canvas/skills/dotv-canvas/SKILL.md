---
name: dotv-canvas
description: "Drive the DOTV infinite canvas — the node graph where a story becomes a script, storyboard, images, video and a finished cut. Use whenever the user asks to put something on their DOTV canvas, inspect or edit existing canvas nodes, wire a flow, or run a generation from the canvas. The canvas is reached through the `dotv` MCP tool, not by editing files."
---

# DOTV canvas

The DOTV canvas is a graph of nodes — text, group, image, video, audio, script,
composite, director — wired by edges into a flow. It is a live document, not a
file format: you reach it through the `dotv` MCP tool.

## Before the first call

Run `dotv_help` once. It lists the command groups. Do not guess command names —
they are versioned with the CLI, and the help text is the contract.

## Know where the commands land

Run `dotv whereami` first when you need to know:

- **Desktop app open on this machine** — canvas commands execute inside that app
  and the user watches them happen. Pass the open canvas id as `--canvas-id`.
- **No desktop app** — the commands go to the DOTV cloud API for the signed-in
  account and show up the next time the canvas is opened.

`dotv whoami` tells you which account is signed in.

## Working on the canvas

1. **Read before you write.** List the nodes, note their ids. Editing a node you
   have not read is guesswork.
2. **One command per call.** The `dotv` tool takes a single command; batching is
   only for what the help text explicitly documents as batchable.
3. **Generations are asynchronous.** Submit the nodes first, then call `dotv_wait`
   once with every node id — not once per node.
4. **Re-read after a change** if you need to report positions, statuses or ids
   that the command did not return.

## Reporting back

The canvas is the deliverable — the user is looking at it while you work. Report
what is on the canvas: node ids, what each one now holds, and which commands are
still running. Keep the report about the canvas, not about your process.
