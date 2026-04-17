import { execa } from "execa";
import { existsSync } from "fs";
import { resolve } from "path";
import { printStepHeader, askText, printSuccess } from "../lib/prompts.js";

const REPO_URL = "https://github.com/your-org/marketing-harness.git";

export async function run({ config }) {
  printStepHeader(2, "プロジェクト設定", "クローン先のディレクトリ名を設定します");

  const projectName = await askText("プロジェクト名 [my-marketing-harness]:", {
    initial: "my-marketing-harness",
    validate: (v) => /^[a-z0-9-]+$/.test(v) ? true : "英小文字・数字・ハイフンのみ使用できます",
  });

  const dir = resolve(process.cwd(), projectName);
  if (existsSync(dir)) {
    console.error(`\n  ディレクトリ "${projectName}" が既に存在します`);
    process.exit(1);
  }

  console.log(`\n  リポジトリをクローン中... (${projectName}/)\n`);
  await execa("git", ["clone", REPO_URL, projectName], { stdio: "inherit" });

  console.log("\n  依存パッケージをインストール中...\n");
  await execa("pnpm", ["install"], { cwd: dir, stdio: "inherit" });

  printSuccess("プロジェクト作成完了");

  config.projectName = projectName;
  config.projectDir = dir;
  config.apiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  return { skipped: false };
}
