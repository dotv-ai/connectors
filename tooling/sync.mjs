#!/usr/bin/env node
// =============================================================================
// 公开连接器仓库的同步 —— packages/connectors → dotv-ai/connectors
// =============================================================================
// 这一块子树是要开源的：它进 dotv-ai/connectors 公开仓库，用户从那儿装 Codex /
// Claude Code 的插件。它跟着 dotv 的版本一起走，所以真源留在私有 monorepo 里，
// 由 CI 同步到公开仓库。
//
// **这个脚本住在子树里，是故意的**：它随同步一起进公开仓库，公开仓库的 CI 拿它
// 自校验（公开仓的 .sync-manifest.json 跟自己的文件对不对得上）。单一实现，两边
// 都能用 —— 私有仓用「拷贝」模式，公开仓用「自校验」模式。
//
// 谁来调：
//
//   · 私有仓 CI（.github/workflows/connectors-sync.yml）—— 合进 main 后跑 --write，
//     把内容推到公开仓的同步分支，再开一个 PR。人只在 do-tv 的 PR 里评审一次，
//     公开仓那边由它自己的 CI 把关。
//   · 人 —— 想看差异就跑 --check 或默认的 dry-run。
//
// 为什么是「拷贝」而不是 git subtree split：subtree 会把 monorepo 的提交历史、
// 作者与提交信息带进公开仓，而且每次同步多一个 merge commit。我们要公开的是
// 「这些文件」，不是「我们怎么改这些文件」。
//
// 漂移怎么查：每次同步在公开仓写一份 .sync-manifest.json，记下每个文件的 sha256
// 和整棵树的 treeHash。--check 拿当前真源重算一遍，跟公开仓那份对账 —— 对不上
// 就是「改了没同步」。反向的漂移（有人在公开仓直接改）由那边的 CODEOWNERS 与
// branch protection 兜底。
//
// 用法：
//
//   node tooling/sync.mjs --target ../connectors           # 只算差异并打印
//   node tooling/sync.mjs --target ../connectors --write   # 落盘（不提交、不推送）
//   node tooling/sync.mjs --target ../connectors --check   # 对账：有漂移退出码 1
//   node tooling/sync.mjs --check                          # 公开仓里自校验
// =============================================================================

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** 真源默认是脚本所在目录的上一级 —— 私有仓里是 packages/connectors，公开仓里是仓库根。 */
const defaultSource = resolve(scriptDir, "..");
const manifestName = ".sync-manifest.json";

/** 不进公开仓库的东西：构建产物、依赖目录、以及同步自己写的清单。 */
const EXCLUDED_NAMES = new Set([
  ".git",
  ".DS_Store",
  "dist",
  "lib",
  "node_modules",
  manifestName,
]);

/** 结尾匹配的不进公开仓库（构建缓存之类）。 */
const EXCLUDED_SUFFIXES = [".tsbuildinfo", ".tgz", ".log"];

// —— 参数 ——

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);

function flagValue(name) {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }
  return args[index + 1];
}

const sourceDir = resolve(
  process.cwd(),
  flagValue("--source") ?? defaultSource,
);

/** 目标默认就是真源本身 —— 公开仓用它做自校验，私有仓显式指到 ../connectors。 */
const targetDir = resolve(process.cwd(), flagValue("--target") ?? sourceDir);

// —— 收集与指纹 ——

/** 递归列出目录下的文件，返回相对路径（posix 分隔符）。 */
function listFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_NAMES.has(entry.name)) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full, base));
      continue;
    }
    if (EXCLUDED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      continue;
    }
    files.push(relative(base, full).split("\\").join("/"));
  }
  return files.sort();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** 整棵树的指纹：把所有「路径 + 内容摘要」按路径排序后再哈希一次。 */
function treeHash(hashes) {
  const lines = Object.keys(hashes)
    .sort()
    .map((path) => `${path} ${hashes[path]}`);
  return sha256(lines.join("\n"));
}

function readSource() {
  if (!existsSync(sourceDir)) {
    throw new Error(`找不到真源目录：${sourceDir}`);
  }
  const files = listFiles(sourceDir);
  const hashes = {};
  for (const path of files) {
    hashes[path] = sha256(readFileSync(join(sourceDir, path)));
  }
  return { files, hashes };
}

function readTargetManifest() {
  const manifestPath = join(targetDir, manifestName);
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return undefined;
  }
}

// —— 差异 ——

/** 对比两边的摘要，返回新增 / 改动 / 删除三组相对路径。 */
function diff(hashes, targetHashes) {
  const added = [];
  const changed = [];
  const removed = [];
  for (const [path, hash] of Object.entries(hashes)) {
    if (!(path in targetHashes)) {
      added.push(path);
    } else if (targetHashes[path] !== hash) {
      changed.push(path);
    }
  }
  for (const path of Object.keys(targetHashes)) {
    if (!(path in hashes)) {
      removed.push(path);
    }
  }
  return { added, changed, removed };
}

// —— 落盘 ——

function writeTarget(files, hashes) {
  for (const path of files) {
    const destination = join(targetDir, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(join(sourceDir, path)));
  }
  for (const path of listFiles(targetDir)) {
    if (path in hashes) {
      continue;
    }
    rmSync(join(targetDir, path), { force: true });
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: relative(process.cwd(), sourceDir) || ".",
    treeHash: treeHash(hashes),
    files: hashes,
  };
  writeFileSync(
    join(targetDir, manifestName),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

// —— 主流程 ——

function main() {
  const source = readSource();
  const targetManifest = readTargetManifest();
  const targetHashes = targetManifest?.files ?? {};
  const changes = diff(source.hashes, targetHashes);
  const drifted =
    targetManifest === undefined ||
    targetManifest.treeHash !== treeHash(source.hashes);

  if (hasFlag("--check")) {
    if (drifted) {
      console.error(
        `[sync] 公开仓库与真源不一致：${targetDir}\n` +
          `  新增 ${changes.added.length} · 改动 ${changes.changed.length} · 删除 ${changes.removed.length}`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`[sync] 一致：${targetDir}`);
    return;
  }

  console.log(`[sync] 真源：${sourceDir}`);
  console.log(`[sync] 目标：${targetDir}`);
  console.log(
    `[sync] 文件 ${source.files.length} 个 · 新增 ${changes.added.length} · 改动 ${changes.changed.length} · 删除 ${changes.removed.length}`,
  );
  for (const path of changes.added) {
    console.log(`  + ${path}`);
  }
  for (const path of changes.changed) {
    console.log(`  ~ ${path}`);
  }
  for (const path of changes.removed) {
    console.log(`  - ${path}`);
  }

  if (!hasFlag("--write")) {
    console.log("[sync] 未落盘（--write 才写）。");
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  writeTarget(source.files, source.hashes);
  console.log("[sync] 已落盘。提交与推送交给 CI 或人。");
}

main();
