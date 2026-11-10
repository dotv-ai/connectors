# bundles

Some harnesses install a plugin as a **package** rather than as a marketplace
entry — DeepSeek Harness, for instance, installs an npm package that carries a
configuration layer. Those need a directory here, one per harness, containing
exactly the files that harness's format requires.

## Rules

- One directory per harness, named after the harness, one level below this
  folder. The platform name never appears at the top level of the repository.
- A bundle is **self-contained**: it must install on its own, so it may not
  depend on workspace packages. Shared code is bundled in at build time or
  reached over MCP — never through a `workspace:` dependency.
- A bundle adds packaging. It does not add capabilities. Capabilities live
  behind the `dotv` MCP server.

## Present

| Harness          | Directory           | Package            | Install                                          |
| ---------------- | ------------------- | ------------------ | ------------------------------------------------ |
| DeepSeek Harness | `deepseek-harness/` | `@dotv/dsh-canvas` | `dsh plugin --profile demo add @dotv/dsh-canvas` |

It gives the agent five tools — list canvases, list nodes, add a text node,
run a node, run a group — over DOTV's HTTP API. It has no runtime
dependencies, so installing it never has to resolve a peer version range.

## Not present

The marketplace entry in `plugins/dotv-canvas/` already covers Codex and Claude
Code; neither needs a package, so neither gets a directory here.
