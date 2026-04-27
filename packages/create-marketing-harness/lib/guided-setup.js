import open from "open";
import { loadSpec, renderGuidedSteps } from "./spec-loader.js";
import { askText, printInfo } from "./prompts.js";
import { runWithClaudeInChrome } from "./claude-in-chrome.js";

export async function runSetup(specId) {
  const auto = await runWithClaudeInChrome({ specId }).catch(() => null);
  if (auto) return auto;
  return runGuidedSetup(specId);
}

export async function runGuidedSetup(specId) {
  const spec = loadSpec(specId);
  const blocks = renderGuidedSteps(spec);

  if (spec.prerequisites?.length) {
    printInfo(["事前確認:", ...spec.prerequisites.map((p) => `・${p}`)]);
    console.log("");
  }

  const result = {};
  for (const block of blocks) {
    if (block.kind === "navigate") {
      console.log(`  ブラウザで開きます: ${block.url}`);
      try { await open(block.url); } catch { /* URL 表示のみで継続 */ }
      console.log("");
    } else if (block.kind === "instruction") {
      console.log(`  → ${block.text}`);
    } else if (block.kind === "extract") {
      result[block.field] = await askText(`  ${block.label}:`, {
        validate: block.pattern
          ? (v) => new RegExp(block.pattern).test(v) || `形式が一致しません (${block.pattern})`
          : undefined,
      });
    }
  }
  return result;
}
