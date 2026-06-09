#!/usr/bin/env node
const { execFileSync } = require("child_process");

function run(command, args, label) {
  console.log(`\n[release-gate] ${label}`);
  execFileSync(command, args, { stdio: "inherit" });
}

function read(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function maybeRunNpmScript(name, label) {
  const scripts = JSON.parse(read("node", ["-e", "console.log(JSON.stringify(require('./package.json').scripts||{}))"]));
  if (!scripts[name]) {
    console.log(`\n[release-gate] ${label}: skipped (npm script '${name}' not configured)`);
    return;
  }
  run("npm", ["run", name], label);
}

const branch = read("git", ["branch", "--show-current"]);
if (!branch) {
  console.error("[release-gate] Could not determine current git branch.");
  process.exit(1);
}
if (branch === "main" || branch === "master") {
  console.error(`[release-gate] BLOCKED: never run release work directly on ${branch}. Create a feature branch first.`);
  process.exit(1);
}

const status = read("git", ["status", "--porcelain"]);
console.log(`[release-gate] Branch: ${branch}`);
console.log(`[release-gate] Changed files: ${status ? status.split("\n").length : 0}`);
if (status) {
  console.log(status);
}

run("npx", ["tsc", "--noEmit"], "TypeScript check");
maybeRunNpmScript("lint", "Lint");
run("npx", ["vitest", "run"], "Unit and API route tests");
maybeRunNpmScript("build", "Production build");

console.log("\n[release-gate] Automated checks complete.");
console.log("[release-gate] Manual checks still required before merge:");
console.log("- Critical flow smoke tests");
console.log("- Admin-only access checks");
console.log("- Environment variable checks");
console.log("- OpenAI integration checks");
console.log("- AI provider checks (DeepSeek disabled by default, fallback, no client-side keys)");
console.log("- Database/store checks");
console.log("- Context loading checks");
console.log("- Responsive UI checks");
console.log("- Dev Gateway OpenAI Release QA review");
console.log("- Bazza approval");
