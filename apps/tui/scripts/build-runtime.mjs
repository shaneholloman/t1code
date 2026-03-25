import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const distDir = path.join(packageDir, "dist");
const entryPath = path.join(packageDir, "src", "index.tsx");
const outputPath = path.join(distDir, "index.mjs");
const require = createRequire(import.meta.url);
const openTuiCoreDir = path.dirname(
  require.resolve("@opentui/core/package.json", { paths: [packageDir] }),
);
const openTuiWorkerEntries = ["parser.worker.js", "parser.worker.js.map"];

await fs.rm(distDir, { force: true, recursive: true });
await fs.mkdir(distDir, { recursive: true });

const build = Bun.spawnSync(
  [
    "bun",
    "build",
    entryPath,
    "--target",
    "bun",
    "--format",
    "esm",
    "--outdir",
    distDir,
    "--entry-naming",
    "[name].mjs",
    "--asset-naming",
    "[name]-[hash].[ext]",
  ],
  {
    cwd: packageDir,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  },
);

if (build.exitCode !== 0) {
  process.exit(build.exitCode ?? 1);
}

const output = await fs.readFile(outputPath, "utf8");
const shebang = "#!/usr/bin/env bun\n";
const nativeSpecifier = "@opentui/core-${process.platform}-${process.arch}/index.ts";
const normalizedNativeSpecifier = "@opentui/core-${process.platform}-${process.arch}";
const normalizedOutput = output.replaceAll(nativeSpecifier, normalizedNativeSpecifier);

if (!normalizedOutput.startsWith(shebang)) {
  await fs.writeFile(outputPath, `${shebang}${normalizedOutput}`, "utf8");
} else if (normalizedOutput !== output) {
  await fs.writeFile(outputPath, normalizedOutput, "utf8");
}

for (const entry of openTuiWorkerEntries) {
  const sourcePath = path.join(openTuiCoreDir, entry);
  const targetPath = path.join(distDir, entry);
  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}
