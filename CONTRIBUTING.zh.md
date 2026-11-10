# 贡献指南

这个仓库的首页讲的是「连接器能做什么」；这一页讲的是「这个仓库怎么搭」——
动它之前先读。

## 真源

真源是私有 `dotv` monorepo 里的 `packages/connectors/`。那边有一条 workflow 在每次合进
main 后把这一块镜像过来：先过公开树的闸，再推到 `sync/connectors` 分支、开一个 PR，
本仓的 CI 绿了自动合并。

也就是说：**在 monorepo 里改，不要直接在这里改**。直接改这里的会被清单校验逮到，
下一次同步就把它盖掉了。

## 目录

| 路径                               | 是什么                                   |
| ---------------------------------- | ---------------------------------------- |
| `.agents/plugins/marketplace.json` | Codex 市场索引                           |
| `.claude-plugin/marketplace.json`  | Claude Code 市场索引                     |
| `plugins/dotv-canvas/`             | 一个市场条目，每个宿主一份 manifest      |
| `plugins/*/skills/`                | agent 读到的文案 —— 按规矩与宿主无关     |
| `bundles/`                         | 需要打成包安装的宿主（而不是走市场条目） |
| `tooling/`                         | 这个仓库给自己用的脚本                   |
| `version.json`                     | 版本号，唯一手写它的地方                 |

## 规矩

- **能力只走 MCP 或 HTTP。** 不出现宿主 SDK、宿主的私有 API、DOTV 的内部实现。
  这一块描述的是 DOTV 的**公开行为**。来一个新宿主，加一份 manifest 就够。
- **不许有 `workspace:` 依赖。** 这一块要能被单独装上。共享代码靠打包内联或 MCP 走到，
  不靠 workspace 协议。
- **宿主名不上顶层。** `bundles/` 按打包形态分组，宿主名在下一层，跟那个宿主的格式
  真正要求的文件放在一起。
- **文案写任务，不写通道。** 写「读画布」「跑生成」，不写「调用 MCP 工具传这些参数」。
  哪句话要提到宿主，那句话就该待在那个宿主自己的文件里。

## 四道闸

四道检查都在本仓 CI 里跑；前两道在私有仓**推之前**也跑一遍 —— 公开仓的分支也是公开的，
推上去就等于发出去了。

| 闸                                | 挡什么                                                |
| --------------------------------- | ----------------------------------------------------- |
| `tooling/sync.mjs --check`        | 树跟同步清单走散                                      |
| `tooling/verify-public-tree.mjs`  | 秘密、私有指向、`workspace:` 依赖、二进制、越界的路径 |
| `tooling/verify-marketplaces.mjs` | 市场条目指向不存在的东西，或名字与 manifest 不一致    |
| `tooling/set-version.mjs --check` | 版本号在 `version.json` 与各 manifest 之间不一致      |

## 版本与发版

`version.json` 是唯一手写版本号的地方，`tooling/set-version.mjs` 把它分发到每一份带
版本号的 manifest 与包里。

新版本进本仓的 `main`，CI 自动补 tag 并发布：bundle 的 npm 包（带 provenance）、每个
bundle 的 tarball（给不想为构建授权的用户直接装）、以及装着两样的 GitHub Release。
全程不用点。
