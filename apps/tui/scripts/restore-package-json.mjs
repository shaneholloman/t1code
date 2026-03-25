import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(packageDir, "package.json");
const backupPath = path.join(packageDir, ".package.json.publish.bak");

try {
  await fs.copyFile(backupPath, packageJsonPath);
  await fs.rm(backupPath, { force: true });
} catch (error) {
  if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}
