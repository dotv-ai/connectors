#!/usr/bin/env node
// =============================================================================
// 版本号 —— 一处真源，几处落地
// =============================================================================
// 版本号要出现在好几个地方：Codex 的 manifest、Claude Code 的 manifest、Claude Code
// 市场索引里的条目、还有各 bundle 的 package.json。手改其中一处，剩下几处就撒谎了
// —— 市场里显示 0.2.0、装下来却是 0.1.0，这种错很难查。
//
// 所以：version.json 是唯一的真源，这个脚本负责把它分发到各处。
//
//   node tooling/set-version.mjs            # 读 version.json，写进各处
//   node tooling/set-version.mjs 0.2.0      # 先改 version.json，再写进各处
//   node tooling/set-version.mjs --check    # 只对账：各处跟 version.json 一致吗
// =============================================================================

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = join(repoRoot, "version.json");
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const requested = args.find((arg) => !arg.startsWith("--"));

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** 所有要带版本号的 manifest，按「文件 → 取版本的地方」列出来。 */
function versionTargets() {
  const targets = [];

  const pluginDirs = existsSync(join(repoRoot, "plugins"))
    ? readdirSync(join(repoRoot, "plugins"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join("plugins", entry.name))
    : [];

  for (const pluginDir of pluginDirs) {
    for (const manifest of [
      ".codex-plugin/plugin.json",
      ".claude-plugin/plugin.json",
    ]) {
      const path = join(pluginDir, manifest);
      if (existsSync(join(repoRoot, path))) {
        targets.push({
          path,
          read: (data) => data.version,
          write: (data, version) => {
            data.version = version;
          },
        });
      }
    }
  }

  const claudeIndex = join(repoRoot, ".claude-plugin/marketplace.json");
  if (existsSync(claudeIndex)) {
    targets.push({
      path: ".claude-plugin/marketplace.json",
      read: (data) =>
        (data.plugins ?? []).map((entry) => entry.version ?? "").join(","),
      write: (data, version) => {
        for (const entry of data.plugins ?? []) {
          entry.version = version;
        }
      },
    });
  }

  const bundlesDir = join(repoRoot, "bundles");
  if (existsSync(bundlesDir)) {
    for (const entry of readdirSync(bundlesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const path = join("bundles", entry.name, "package.json");
      if (existsSync(join(repoRoot, path))) {
        targets.push({
          path,
          read: (data) => data.version,
          write: (data, version) => {
            data.version = version;
          },
        });
      }
    }
  }

  return targets;
}

function main() {
  if (!existsSync(versionFile)) {
    console.error("缺少 version.json —— 版本号的真源");
    process.exitCode = 1;
    return;
  }

  if (requested && !checkOnly) {
    if (!SEMVER.test(requested)) {
      console.error(`版本号不像 semver：${requested}`);
      process.exitCode = 1;
      return;
    }
    const current = readJson(versionFile);
    current.version = requested;
    writeJson(versionFile, current);
  }

  const version = readJson(versionFile).version;
  if (!SEMVER.test(version)) {
    console.error(`version.json 里的版本号不像 semver：${version}`);
    process.exitCode = 1;
    return;
  }

  const targets = versionTargets();
  const mismatched = [];

  for (const target of targets) {
    const full = join(repoRoot, target.path);
    const data = readJson(full);
    const current = target.read(data);
    if (current === version) {
      continue;
    }
    if (checkOnly) {
      mismatched.push(`${target.path}：${current || "(空)"} ≠ ${version}`);
      continue;
    }
    target.write(data, version);
    writeJson(full, data);
    console.log(`${target.path} → ${version}`);
  }

  if (checkOnly) {
    if (mismatched.length > 0) {
      for (const line of mismatched) {
        console.error(`✗ ${line}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`✓ 版本号一致：${version}`);
    return;
  }

  console.log(`版本号：${version}（${targets.length} 处）`);
}

main();
