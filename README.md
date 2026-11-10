# DOTV Connectors

DOTV is an AI video creation canvas: one infinite board where a story becomes a
script, a storyboard, images, video, voice and a finished cut.

**DOTV Connectors let your coding agent work on that canvas.** Ask it to turn a
script into a storyboard, add a node, run a generation, or just tell you what is
already on the board — the work happens on your canvas, and you watch it happen
while it runs.

## What the agent can do

| You say                              | It does                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| "What's on my canvas?"               | Lists the nodes and what each one holds                   |
| "Turn this script into a storyboard" | Adds script and shot nodes, wires them into a flow        |
| "Add an image node and generate it"  | Adds the node, submits the generation                     |
| "Add this image to node 12"          | Puts an existing asset onto the canvas                    |
| "Is the video ready?"                | Waits for the running generations and reports their state |

It works with the canvas you already have: text, group, image, video, audio,
script, composite and director nodes, connected by edges into a flow.

## Install

### Codex

```sh
codex plugin marketplace add dotv-ai/connectors --ref main
codex plugin add dotv-canvas@connectors
```

### Claude Code

```
/plugin marketplace add dotv-ai/connectors
/plugin install dotv-canvas@connectors
```

### Any MCP client

```sh
claude mcp add dotv -- npx -y @dotv/cli mcp
codex mcp add dotv -- npx -y @dotv/cli mcp
```

### DeepSeek Harness

```sh
dsh plugin --profile demo add https://github.com/dotv-ai/connectors/releases/latest/download/dotv-dsh-canvas.tgz
```

The npm route (`dsh plugin add @dotv/dsh-canvas`) is on its way — see
[CONTRIBUTING.md](./CONTRIBUTING.md) for how releases are cut.

## What you need

- A DOTV account — <https://dotv.ai>.
- If the DOTV desktop app is open on this machine, the agent's commands run
  inside it and you watch them happen. Otherwise they run against the cloud and
  show up the next time you open the canvas.

Running a generation — an image, a video clip, an audio take — consumes credits
on your account, exactly as it does in the app.

## License

MIT covers the code in this repository ([LICENSE](./LICENSE)); the DOTV product
itself is closed source and is not covered by it. Trademarks, credits and the
boundary between the two are spelled out in [NOTICE.md](./NOTICE.md).

For how this repository is put together and maintained, see
[CONTRIBUTING.md](./CONTRIBUTING.md).
