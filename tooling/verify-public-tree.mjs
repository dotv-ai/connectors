#!/usr/bin/env node
// =============================================================================
// 公开树的闸 —— 这棵树要进公开仓，所以它自己得先过一遍闸
// =============================================================================
// 私有仓没有评审这回事（单人开发）。那「这段会不会泄出去」靠谁保证？靠人记着不
// 行 —— 于是把这道判断写成机器能跑的规则，让 CI 每次同步都跑一遍。
//
// 挡的是什么（每一条都是具体的，不是"注意保密"）：
//
//   · 秘密 —— token、密钥、私钥块、环境变量里的凭据；
//   · 私有指向 —— 私有仓地址、内网地址、只在内部用的域名；
//   · 不该有的依赖 —— workspace: 协议（那块树要能被单独 npm install）；
//   · 不该有的文件 —— 二进制、大文件、清单外的路径与扩展名。
//
// 它不判断代码好不好，也不判断功能对不对 —— 那些靠写的时候的纪律（见 do-tv 的
// AGENTS.md「公开连接器」一节）。它只判断「这东西能不能公开」。
//
// 用法：
//
//   node tooling/verify-public-tree.mjs            # 查当前目录（公开仓里）
//   node tooling/verify-public-tree.mjs <目录>      # 查指定的树
// =============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const targetDir = resolve(
  process.cwd(),
  process.argv[2] ?? resolve(scriptDir, ".."),
);

/** 顶层允许出现的目录。 */
const ALLOWED_TOP_DIRS = new Set([
  ".agents",
  ".claude-plugin",
  ".github",
  "bundles",
  "core",
  "plugins",
  "tooling",
]);

/** 顶层允许出现的文件。 */
const ALLOWED_TOP_FILES = new Set([
  "CONTRIBUTING.md",
  "CONTRIBUTING.zh.md",
  "LICENSE",
  "NOTICE.md",
  "README.md",
  "README.zh.md",
  "version.json",
]);

/** 允许的扩展名（LICENSE 没有扩展名，单列在上面）。 */
const ALLOWED_EXTENSIONS = new Set([
  ".json",
  ".js",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

/** 单个文件的上限 —— 挡住「顺手把设计稿/录屏拷进来了」。 */
const MAX_FILE_BYTES = 256 * 1024;

/** 秘密的形态。命中就红，不解释为什么 —— 解释容易变成「这个是例外」。 */
const SECRET_PATTERNS = [
  { name: "私钥块", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "OpenAI 风格密钥", pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Bearer 凭据", pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}/ },
  {
    name: "写死的凭据赋值",
    pattern:
      /\b(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/i,
  },
];

/** 私有指向：这些出现在公开树里就说明写错了地方。 */
const PRIVATE_POINTERS = [
  { name: "私有仓地址", pattern: /github\.com\/dotv-ai\/dotv\b/ },
  {
    name: "内网地址",
    pattern: /https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)/,
  },
  { name: "内部域名", pattern: /\b[a-z0-9-]+\.(internal|intranet|corp)\b/i },
  { name: "workers.dev 子域", pattern: /\b[a-z0-9-]+\.workers\.dev\b/ },
];

const problems = [];

function fail(message) {
  problems.push(message);
}

/** 递归列出文件（相对路径，posix 分隔符）。 */
function listFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full, base));
      continue;
    }
    files.push(relative(base, full).split("\\").join("/"));
  }
  return files.sort();
}

/** 顶层路径检查：目录与文件各有一张白名单。 */
function checkTopLevel(path) {
  const parts = path.split("/");
  if (parts.length === 1) {
    if (
      !ALLOWED_TOP_FILES.has(parts[0]) &&
      parts[0] !== ".sync-manifest.json"
    ) {
      fail(`${path}：顶层不允许出现这个文件`);
    }
    return;
  }
  if (!ALLOWED_TOP_DIRS.has(parts[0])) {
    fail(`${path}：顶层不允许出现这个目录`);
  }
}

function extensionOf(path) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot);
}

function main() {
  if (!existsSync(targetDir)) {
    console.error(`找不到目录：${targetDir}`);
    process.exitCode = 1;
    return;
  }
  const files = listFiles(targetDir);

  for (const path of files) {
    checkTopLevel(path);
    const full = join(targetDir, path);
    const size = statSync(full).size;
    if (size > MAX_FILE_BYTES) {
      fail(`${path}：${size} 字节，超过 ${MAX_FILE_BYTES} 的上限`);
    }
    const extension = extensionOf(path);
    if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
      fail(`${path}：扩展名 ${extension} 不在允许清单里`);
    }
    const buffer = readFileSync(full);
    if (buffer.includes(0)) {
      fail(`${path}：二进制文件不进公开树`);
    }
    const text = buffer.toString("utf8");
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        fail(`${path}：疑似${name}`);
      }
    }
    for (const { name, pattern } of PRIVATE_POINTERS) {
      if (pattern.test(text)) {
        fail(`${path}：出现${name}`);
      }
    }
    if (extension === ".json" && text.includes("workspace:")) {
      fail(`${path}：出现 workspace: 依赖 —— 这块树要能被单独安装`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`✗ ${problem}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${files.length} 个文件，都过了公开树的闸`);
}

main();
