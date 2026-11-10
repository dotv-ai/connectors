# DOTV Canvas

An infinite canvas where a story becomes a script, a storyboard, images, video,
voice and a finished cut. This plugin puts that canvas within reach of your
agent.

## What the agent can do

- **Read the canvas** — list the canvases of your account, then the nodes on one
  of them: type, status, a snippet of the text or prompt, position.
- **Add a node** — put a text node on the canvas as a draft.
- **Run a generation** — run one node, or every pending node inside a group.
  Video comes back with a task id that is still pending; read the canvas again to
  see how it settled.

## What you need

- A DOTV account — <https://dotv.ai>.
- A credential. If you have run `dotv login` on this machine, the plugin uses
  that session; otherwise set an API key in the plugin's configuration.
- A canvas to work on. Give the agent the canvas id, or set one in the
  configuration so every call lands on the same board.

## Notes

- Generations consume credits on your account, exactly as they do in the app.
- The canvas itself is not rendered inside the harness — open DOTV in a browser
  to watch the work happen.
