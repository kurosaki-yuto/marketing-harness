import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";

export function loadCommands(projectDir) {
  const commandsDir = join(projectDir, ".claude/commands");
  if (!existsSync(commandsDir)) return [];

  const files = readdirSync(commandsDir).filter((f) => f.endsWith(".md")).sort();

  return files.map((file) => {
    const slug = "/" + basename(file, ".md");
    const content = readFileSync(join(commandsDir, file), "utf8");
    const match = content.match(/^---[\s\S]*?^description:\s*(.+)$/m);
    const description = match ? match[1].trim() : slug;
    return { slug, description };
  });
}
