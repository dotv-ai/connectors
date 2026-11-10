#!/usr/bin/env node
// =============================================================================
// 品牌图标对账 —— 连接器用的图标得跟 DOTV 的 logo 是同一份
// =============================================================================
// 连接器里的 icon.svg 是 DOTV logo 的一份拷贝（logo 本身是 `pnpm icons:brand`
// 从 brand-icons.ts 生成的产物，见 packages/web/app/icon.svg）。
//
// 两份东西各改各的，是这类「拷贝资产」最常见的腐烂方式：logo 换了，连接器的图标
// 还停在旧版，公开仓上的商店卡片跟网站上的 logo 对不上，而且没人会发现。
//
// 所以这份拷贝由机器盯着：出仓之前对一次账，不一致就拦下来。
//
// 在公开仓里跑的时候找不到源文件（那是私有仓的东西），那就跳过 —— 公开仓自己那份
// 只需要跟它自己的 .sync-manifest.json 对得上，那道闸另有其事。
// =============================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** 连接器里的那份（公开树内）。 */
const iconPath = join(repoRoot, "plugins/dotv-canvas/assets/icon.svg");

/** 真源：do-tv 仓里由 `pnpm icons:brand` 生成的那份 logo。 */
const sourcePath = resolve(repoRoot, "../web/app/icon.svg");

function main() {
  if (!existsSync(sourcePath)) {
    console.log("[brand] 这里没有 DOTV logo 的真源（公开仓），跳过对账。");
    return;
  }
  if (!existsSync(iconPath)) {
    console.error(`[brand] 缺图标：${iconPath}`);
    process.exitCode = 1;
    return;
  }
  const icon = readFileSync(iconPath);
  const source = readFileSync(sourcePath);
  if (icon.equals(source)) {
    console.log("[brand] 图标与 DOTV logo 一致");
    return;
  }
  console.error(
    "[brand] 连接器的图标跟 DOTV logo 对不上 —— 换一下：\n" +
      "  cp packages/web/app/icon.svg packages/connectors/plugins/dotv-canvas/assets/icon.svg",
  );
  process.exitCode = 1;
}

main();
