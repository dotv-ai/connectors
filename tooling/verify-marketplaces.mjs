#!/usr/bin/env node
// =============================================================================
// 市场索引自校验 —— 公开仓 CI 的那道闸
// =============================================================================
// 公开仓是「一份市场索引 + 若干条目」的结构：Codex 读 .agents/plugins/marketplace.json，
// Claude Code 读 .claude-plugin/marketplace.json，两者指向同一批条目目录。
//
// 索引写错了不会有人立刻发现 —— Codex 会静默地不列出这个插件，用户装不上，而报错
// 出现在他那边。所以这道闸在公开仓里跑：索引里的每一条都要能在磁盘上找到对应目录，
// 目录里要有该宿主要求的 manifest，两边的名字还要一致。
//
// 它只查形状与存在性，不查「插件好不好用」——那是评审的事。
// =============================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** 每个宿主的「市场索引在哪」与「条目里必须有什么」。 */
const MARKETS = [
  {
    label: "Codex",
    index: ".agents/plugins/marketplace.json",
    manifest: ".codex-plugin/plugin.json",
    readIndex: (index) => index.plugins ?? [],
    readEntryPath: (entry) => entry.source?.path,
  },
  {
    label: "Claude Code",
    index: ".claude-plugin/marketplace.json",
    manifest: ".claude-plugin/plugin.json",
    readIndex: (index) => index.plugins ?? [],
    readEntryPath: (entry) =>
      typeof entry.source === "string" ? entry.source : entry.source?.path,
  },
];

const problems = [];

function fail(message) {
  problems.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} 解析失败：${error.message}`);
    return undefined;
  }
}

for (const market of MARKETS) {
  const indexPath = join(repoRoot, market.index);
  if (!existsSync(indexPath)) {
    fail(`缺少市场索引：${market.index}`);
    continue;
  }
  const index = readJson(indexPath);
  if (!index) {
    continue;
  }
  if (typeof index.name !== "string" || index.name.length === 0) {
    fail(`${market.index} 缺少 name`);
  }
  const entries = market.readIndex(index);
  if (entries.length === 0) {
    fail(`${market.index} 里没有插件条目`);
  }
  for (const entry of entries) {
    const entryPath = market.readEntryPath(entry);
    if (typeof entryPath !== "string" || entryPath.length === 0) {
      fail(`${market.index} 的条目 ${entry.name} 缺 source`);
      continue;
    }
    const entryDir = resolve(repoRoot, entryPath);
    const manifestPath = join(entryDir, market.manifest);
    if (!existsSync(manifestPath)) {
      fail(`${market.label} 条目 ${entry.name} 缺 ${market.manifest}`);
      continue;
    }
    const manifest = readJson(manifestPath);
    if (!manifest) {
      continue;
    }
    if (manifest.name !== entry.name) {
      fail(
        `${market.label} 条目名与 manifest 不一致：索引 ${entry.name} / manifest ${manifest.name}`,
      );
    }
    for (const field of ["version", "description"]) {
      if (typeof manifest[field] !== "string" || manifest[field].length === 0) {
        fail(`${market.label} 的 ${entry.name} 缺 ${field}`);
      }
    }
    const mcpPath = join(entryDir, ".mcp.json");
    if (existsSync(mcpPath)) {
      const mcp = readJson(mcpPath);
      if (mcp && Object.keys(mcp.mcpServers ?? {}).length === 0) {
        fail(`${market.label} 的 ${entry.name} 的 .mcp.json 里没有 server`);
      }
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`✗ ${problem}`);
  }
  process.exitCode = 1;
} else {
  console.log("✓ 市场索引与条目都对得上");
}
