import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const tuiRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(tuiRoot, "../..");
const serverRoot = path.resolve(repoRoot, "apps/server");
const serverDistSource = path.resolve(serverRoot, "dist");
const serverDistTarget = path.resolve(tuiRoot, "dist/server");
const serverClientSource = path.resolve(serverDistSource, "client");
const nodePtySource = path.resolve(
  repoRoot,
  "node_modules/.bun/node-pty@1.1.0/node_modules/node-pty",
);
const nodePtyTarget = path.resolve(serverDistTarget, "node_modules/node-pty");
const nodePtyRuntimeEntries = [
  "LICENSE",
  "README.md",
  "package.json",
  "lib",
  "prebuilds",
  "typings",
];

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed in ${cwd} (${signal ? `signal ${signal}` : `exit ${code ?? "unknown"}`}).`,
        ),
      );
    });
    child.once("error", reject);
  });
}

await run("bun", ["run", "build"], serverRoot);
await fs.rm(serverDistTarget, { recursive: true, force: true });
await fs.mkdir(path.dirname(serverDistTarget), { recursive: true });
await run(
  "bun",
  [
    "build",
    "src/index.ts",
    "--target=node",
    "--format=esm",
    "--splitting",
    "--packages=bundle",
    "--external",
    "node-pty",
    "--outdir",
    serverDistTarget,
  ],
  serverRoot,
);
await fs.cp(serverClientSource, path.resolve(serverDistTarget, "client"), { recursive: true });
await fs.mkdir(path.dirname(nodePtyTarget), { recursive: true });
await fs.rm(nodePtyTarget, { recursive: true, force: true });
await fs.mkdir(nodePtyTarget, { recursive: true });
for (const entry of nodePtyRuntimeEntries) {
  await fs.cp(path.resolve(nodePtySource, entry), path.resolve(nodePtyTarget, entry), {
    recursive: true,
  });
}
