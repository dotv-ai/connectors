# dotv-canvas

Let your coding agent work on the DOTV infinite canvas.

## What it does

- **Reads the canvas** — lists the nodes and what each one holds, so the agent
  can talk about the board that is really there.
- **Builds on it** — adds text, group, image, video, audio, script, composite and
  director nodes, and wires them into a flow with edges.
- **Runs generations** — submits image, video and audio generations for the nodes
  it adds, and reports which ones are still running.
- **Waits properly** — generations are asynchronous, so it submits first and
  waits once for all of them, instead of blocking on each.

## What you need

- A DOTV account — <https://dotv.ai>.
- With the DOTV desktop app open locally, the work happens on the canvas you are
  looking at. Otherwise it happens in the cloud.
- Generations consume credits on your account.

## Usage

Ask in plain language — "what's on my canvas", "turn this into a storyboard",
"add an image node and generate it". The agent reads the canvas before changing
it, one command at a time, and reports what ended up on the board.
