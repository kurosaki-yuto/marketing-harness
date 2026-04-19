import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal YAML parser for the setup-spec format (no external dependency needed)
// Handles: string scalars, block mappings, block sequences, nested mappings
function parseYaml(text) {
  const lines = text.split("\n");
  return parseMapping(lines, 0, 0).value;
}

function parseMapping(lines, startIndex, indent) {
  const obj = {};
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (trimmed === "" || trimmed.startsWith("#")) { i++; continue; }
    const currentIndent = line.length - line.trimStart().length;
    if (currentIndent < indent) break;
    if (currentIndent > indent) { i++; continue; }

    const colonIdx = trimmed.indexOf(": ");
    const colonEnd = trimmed.endsWith(":");
    if (!colonIdx && !colonEnd) { i++; continue; }

    const key = colonEnd ? trimmed.slice(currentIndent).slice(0, -1) : trimmed.slice(currentIndent, colonIdx);
    if (colonEnd || trimmed.slice(colonIdx + 2).trim() === "") {
      // Value is on next lines
      const next = findNextContent(lines, i + 1);
      if (next < lines.length) {
        const nextIndent = lines[next].length - lines[next].trimStart().length;
        if (lines[next].trimStart().startsWith("- ")) {
          const { value, nextIndex } = parseSequence(lines, next, nextIndent);
          obj[key] = value;
          i = nextIndex;
        } else {
          const { value, nextIndex } = parseMapping(lines, next, nextIndent);
          obj[key] = value;
          i = nextIndex;
        }
      } else {
        obj[key] = null;
        i++;
      }
    } else {
      obj[key] = unquote(trimmed.slice(colonIdx + 2).trim());
      i++;
    }
  }
  return { value: obj, nextIndex: i };
}

function parseSequence(lines, startIndex, indent) {
  const arr = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (trimmed === "" || trimmed.startsWith("#")) { i++; continue; }
    const currentIndent = line.length - line.trimStart().length;
    if (currentIndent < indent) break;
    if (!line.trimStart().startsWith("- ")) { i++; continue; }

    const itemStr = line.trimStart().slice(2).trim();
    if (itemStr === "") {
      // Nested mapping
      const next = findNextContent(lines, i + 1);
      if (next < lines.length) {
        const nestedIndent = lines[next].length - lines[next].trimStart().length;
        const { value, nextIndex } = parseMapping(lines, next, nestedIndent);
        arr.push(value);
        i = nextIndex;
      } else {
        i++;
      }
    } else if (itemStr.includes(": ") || itemStr.endsWith(":")) {
      // Inline mapping item (e.g. "- navigate: url")
      const colonIdx = itemStr.indexOf(": ");
      const colonEnd = itemStr.endsWith(":");
      if (colonEnd) {
        const key = itemStr.slice(0, -1);
        const next = findNextContent(lines, i + 1);
        if (next < lines.length) {
          const nestedIndent = lines[next].length - lines[next].trimStart().length;
          const { value, nextIndex } = parseMapping(lines, next, nestedIndent);
          arr.push({ [key]: value });
          i = nextIndex;
        } else {
          arr.push({ [key]: null });
          i++;
        }
      } else {
        const key = itemStr.slice(0, colonIdx);
        const val = itemStr.slice(colonIdx + 2).trim();
        arr.push({ [key]: unquote(val) });
        i++;
      }
    } else {
      arr.push(unquote(itemStr));
      i++;
    }
  }
  return { value: arr, nextIndex: i };
}

function findNextContent(lines, from) {
  let i = from;
  while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
  return i;
}

function unquote(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

export function loadSpec(specId) {
  const specPath = join(__dirname, "../templates/setup-spec", `${specId}.yaml`);
  const raw = readFileSync(specPath, "utf8");
  return parseYaml(raw);
}

export function getExtracts(spec) {
  if (spec.extracts && spec.extracts.length > 0) return spec.extracts;
  return spec.steps.filter((s) => s.extract).map((s) => s.extract);
}

export function buildPrompt(spec) {
  const lines = [
    `あなたはブラウザを操作して「${spec.label}」の認証情報を取得します。`,
  ];

  if (spec.prerequisites && spec.prerequisites.length > 0) {
    lines.push("\n## 事前確認（作業前に確認してください）");
    for (const pre of spec.prerequisites) lines.push(`- ${pre}`);
  }

  lines.push("\n## 手順（順番に実行してください）\n");

  let num = 1;
  for (const step of spec.steps) {
    if (step.navigate) {
      lines.push(`${num}. 次の URL を開いてください: ${step.navigate}`);
    } else if (step.action) {
      lines.push(`${num}. ${step.action}`);
    } else if (step.extract) {
      lines.push(`${num}. 「${step.extract.label}」を画面から見つけてコピーしてください`);
    } else if (step.verify) {
      lines.push(`${num}. [検証] ${step.verify.description}`);
      if (step.verify.url_template) lines.push(`   確認方法: ${step.verify.url_template}`);
      if (step.verify.expect) lines.push(`   期待値: ${step.verify.expect}`);
    }
    num++;
  }

  const extracts = getExtracts(spec);
  const outputObj = {};
  for (const f of extracts) outputObj[f.field] = `（${f.label}をここに）`;

  lines.push("\n## 出力形式");
  lines.push("全ての手順が完了したら、取得した値を以下の JSON 形式のみで出力してください（説明文は不要）:");
  lines.push("```json");
  lines.push(JSON.stringify(outputObj, null, 2));
  lines.push("```");

  if (spec.troubleshooting && spec.troubleshooting.length > 0) {
    lines.push("\n## もし詰まったら");
    for (const t of spec.troubleshooting) {
      lines.push(`\n**症状**: ${t.symptom}`);
      lines.push(`**原因**: ${t.cause}`);
      lines.push(`**対処**: ${t.fix}`);
    }
  }

  return lines.join("\n");
}

export function extractFieldNames(spec) {
  return getExtracts(spec).map((f) => f.field);
}
