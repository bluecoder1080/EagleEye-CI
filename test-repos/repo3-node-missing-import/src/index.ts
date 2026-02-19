// Missing: import fs from "fs";
// Missing: import path from "path";

export function readConfig(filePath: string): string {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return content;
}

export function writeConfig(filePath: string, data: string): void {
  fs.writeFileSync(filePath, data, "utf-8");
}
