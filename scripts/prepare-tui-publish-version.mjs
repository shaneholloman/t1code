import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "apps/tui/package.json");

function writeGithubOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  return fs.appendFile(outputPath, `${key}=${value}\n`, "utf8");
}

function stripToCoreVersion(version) {
  const match = /^(\d+\.\d+\.\d+)/.exec(version);
  if (!match) {
    throw new Error(`Unsupported package version: ${version}`);
  }
  return match[1];
}

async function updateVersion(nextVersion) {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  packageJson.version = nextVersion;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  await writeGithubOutput("version", nextVersion);
  console.log(nextVersion);
}

async function prepareDevVersion() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const baseVersion = stripToCoreVersion(packageJson.version);
  const runNumber = process.env.GITHUB_RUN_NUMBER;
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
  const sha = process.env.GITHUB_SHA?.slice(0, 7);

  if (!runNumber || !runAttempt || !sha) {
    throw new Error("GITHUB_RUN_NUMBER, GITHUB_RUN_ATTEMPT, and GITHUB_SHA are required.");
  }

  await updateVersion(`${baseVersion}-dev.${runNumber}.${runAttempt}.${sha}`);
}

async function verifyTaggedVersion() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const tagName = process.env.GITHUB_REF_NAME;
  const expectedVersion = tagName?.replace(/^v/, "");

  if (!tagName || !expectedVersion) {
    throw new Error("GITHUB_REF_NAME is required.");
  }

  if (packageJson.version !== expectedVersion) {
    throw new Error(
      `Tag ${tagName} does not match apps/tui/package.json version ${packageJson.version}.`,
    );
  }

  await writeGithubOutput("version", expectedVersion);
  console.log(expectedVersion);
}

const mode = process.argv[2];

if (mode === "dev") {
  await prepareDevVersion();
} else if (mode === "tag") {
  await verifyTaggedVersion();
} else {
  throw new Error("Usage: node scripts/prepare-tui-publish-version.mjs <dev|tag>");
}
