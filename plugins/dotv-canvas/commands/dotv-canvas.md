---
description: Open the DOTV canvas and act on it
argument-hint: [what to build, read or change on the canvas]
---

# /dotv-canvas

Act on the DOTV infinite canvas.

## Arguments

- `$ARGUMENTS`: what to build, read or change on the canvas. Optional — with no
  argument, report what is currently on the open canvas.

## Workflow

1. Run `dotv_help` once to learn the command groups.
2. Run `dotv whereami` to find out whether commands run inside a locally open
   desktop app or against the cloud API, and which project and canvas are open.
3. Read the canvas (list the nodes) before changing anything.
4. Carry out the request with the `dotv` tool, one command per call.
5. For any generation, submit the nodes first and then call `dotv_wait` once
   with every node id.
6. Report what is now on the canvas: node ids, their state, and anything still
   running.
