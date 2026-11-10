# DOTV Connectors

DOTV 是一块 AI 视频创作画布：剧本、分镜、图片、视频、配音、成片，全在一张无限画布上。

**DOTV Connectors 让你的编码 agent 直接在这块画布上干活。** 你说「把这段剧本变成分镜」、
「加个图片节点并生成」、「画布上现在有什么」，它就在画布上动手 —— 你在旁边看着它跑。

## agent 能做什么

| 你说                     | 它做                             |
| ------------------------ | -------------------------------- |
| 「画布上有什么？」       | 列出节点，以及每个节点里装着什么 |
| 「把这段剧本变成分镜」   | 加上剧本与分镜节点，连成流程     |
| 「加个图片节点并生成」   | 加上节点，把生成提交出去         |
| 「这张图放进 12 号节点」 | 把已有素材放到画布上             |
| 「视频好了吗？」         | 等在跑的生成落定，报状态         |

它动的是你已经在用的那块画布：文本、分组、图片、视频、音频、剧本、合成、导演八类节点，
用连线组成流程。

## 安装

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

### 任何 MCP 客户端

```sh
claude mcp add dotv -- npx -y @dotv/cli mcp
codex mcp add dotv -- npx -y @dotv/cli mcp
```

### DeepSeek Harness

```sh
dsh plugin --profile demo add https://github.com/dotv-ai/connectors/releases/latest/download/dotv-dsh-canvas.tgz
```

npm 那条路（`dsh plugin add @dotv/dsh-canvas`）正在路上 —— 发版怎么切的见
[CONTRIBUTING.md](./CONTRIBUTING.md)。

## 你需要什么

- 一个 DOTV 账号 —— <https://dotv.ai>。
- 这台机器上开着 DOTV 桌面端时，agent 的命令在桌面端里执行，你看着它发生；没开就
  走云端，下次打开画布时能看到结果。

跑生成（出图、生视频、做音频）在你的账号上消耗积分，跟在应用里做一样。

## 授权

MIT 覆盖本仓库里的代码（[LICENSE](./LICENSE)）；DOTV 产品本身是闭源的，不在授权范围内。
商标、积分，以及两者之间的边界写在 [NOTICE.md](./NOTICE.md)。

这个仓库怎么搭、怎么维护，见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
