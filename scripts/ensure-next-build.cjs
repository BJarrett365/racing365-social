/**
 * `next start` requires a prior `next build` (distDir/BUILD_ID).
 * Without it, every route (including /) often returns 500 or an empty error.
 */
const fs = require("fs");
const path = require("path");

const distDir = (process.env.NEXT_DIST_DIR || ".next").trim() || ".next";
const buildId = path.join(process.cwd(), distDir, "BUILD_ID");
if (!fs.existsSync(buildId)) {
  console.error(`
[ensure-next-build] No production build found (${distDir}/BUILD_ID missing).

  Local development (hot reload):
    npm run dev

  Production-style server:
    npm run build && npm run start
`);
  process.exit(1);
}
