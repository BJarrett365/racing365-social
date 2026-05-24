#!/usr/bin/env node
/**
 * Repairs duplicate Content Creator profiles in data/local/language-studio.json
 * (URL-as-name vs display name). Implements Phase 1 one-time consolidation.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const runner = path.join(root, "scripts/repair-journalist-profile-runner.ts");
const shell = process.platform === "win32";
const result = spawnSync("npx", ["tsx", runner], { cwd: root, stdio: "inherit", env: process.env, shell });
process.exit(result.status ?? 1);
