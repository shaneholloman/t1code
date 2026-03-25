import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(packageDir, "package.json");
const backupPath = path.join(packageDir, ".package.json.publish.bak");

const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

const publishedPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  homepage: packageJson.homepage,
  bugs: packageJson.bugs,
  license: packageJson.license,
  repository: packageJson.repository,
  bin: packageJson.bin,
  files: packageJson.files,
  type: packageJson.type,
  publishConfig: packageJson.publishConfig,
  dependencies: packageJson.dependencies,
  optionalDependencies: packageJson.optionalDependencies,
  engines: packageJson.engines,
};

await fs.copyFile(packageJsonPath, backupPath);
await fs.writeFile(packageJsonPath, `${JSON.stringify(publishedPackageJson, null, 2)}\n`, "utf8");
