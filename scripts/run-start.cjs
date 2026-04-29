/**
 * `next start` with the same default bind rules as run-dev (see print-default-listen-host.cjs).
 */
const { spawn } = require("child_process");
const { join } = require("path");
const { execFileSync } = require("child_process");

const root = join(__dirname, "..");
const port = process.env.PORT || "8081";
let host;
try {
  host = execFileSync(process.execPath, [join(__dirname, "print-default-listen-host.cjs")], {
    encoding: "utf8",
    cwd: root,
  }).trim();
} catch {
  host = "0.0.0.0";
}
if (!host) host = "0.0.0.0";

console.error(`[run-start] http://localhost:${port}/ and http://127.0.0.1:${port}/ (bind -H ${host}; override with DEV_HOST)\n`);

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "start", "-p", port, "-H", host], {
  cwd: root,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
