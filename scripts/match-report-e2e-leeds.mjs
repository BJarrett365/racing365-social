#!/usr/bin/env node
/**
 * End-to-end Match Report Builder run for Leeds vs Brighton (2990364).
 * Usage: node scripts/match-report-e2e-leeds.mjs [projectId]
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
const BASE = process.env.MATCH_REPORT_E2E_BASE?.trim() || "http://127.0.0.1:8081";
const PROJECT_ID = process.argv[2]?.trim() || "mrpt-mpj2jbcv-o1mh7g";
const SESSION_SECRET =
  process.env.PLEXA_SESSION_SECRET?.trim() ||
  process.env.ADMIN_TOKEN?.trim() ||
  "plexa-local-dev-session-secret-change-before-hosting";

const SOURCES = {
  sport365: "https://www.sport365.com/football/england/premier-league/leeds-vs-brighton/1-4157164",
  whoscored:
    "https://www.whoscored.com/matches/1903453/livestatistics/england-premier-league-2025-2026-leeds-brighton",
  youtube: "https://www.youtube.com/watch?v=OFYs2X5pIYg",
};

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sessionCookie() {
  const payload = { userId: "e2e-local", role: "admin", exp: Math.floor(Date.now() / 1000) + 86400 };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `plexa_session=${body}.${sig}`;
}

async function api(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${route} → ${res.status}: ${data.error || text.slice(0, 300)}`);
  }
  return data;
}

async function pollJob(jobId, label, maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const job = await api("GET", `/api/match-report/jobs/${jobId}`);
      process.stdout.write(`\r  ${label}: ${job.status}${job.phase ? ` — ${job.phase}` : ""}   `);
      if (job.status === "completed") {
        console.log("");
        return job;
      }
      if (job.status === "failed") {
        console.log("");
        throw new Error(`${label} failed: ${job.error || "unknown"}`);
      }
    } catch (err) {
      if (!String(err.message).includes("404")) throw err;
      const project = await api("GET", `/api/match-report/projects/${PROJECT_ID}`).then((d) => d.project ?? d);
      if (project.mediaOutputs?.reportHtml) {
        console.log("");
        return { status: "completed", project };
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${label} timed out after ${maxMs}ms`);
}

function wordCount(html) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

function step(name, fn) {
  process.stdout.write(`\n▶ ${name}… `);
  return fn().then(
    (result) => {
      console.log("OK");
      return result;
    },
    (err) => {
      console.log("FAIL");
      throw err;
    },
  );
}

async function main() {
  console.log(`Match Report E2E — project ${PROJECT_ID}`);
  console.log(`Base URL: ${BASE}`);

  let   project = await step("Load project", () =>
    api("GET", `/api/match-report/projects/${PROJECT_ID}`).then((d) => d.project ?? d),
  );

  const commSample = project.layers?.sport365Commentary?.lines?.[0]?.text ?? "";
  const commLooksValid =
    (project.layers?.sport365Commentary?.lines?.length ?? 0) > 20 &&
    !commSample.includes('"name":"Leeds"') &&
    !commSample.includes("buildId");

  if (!commLooksValid) {
    project = await step("Re-import Sport365 commentary", () =>
      api("POST", "/api/match-report/import/sport365-commentary", {
        projectId: PROJECT_ID,
        url: SOURCES.sport365,
      }).then((d) => d.project),
    );
  } else {
    console.log("\n▶ Sport365 commentary already valid — skip re-import");
  }

  const commLines = project.layers?.sport365Commentary?.lines?.length ?? 0;
  const commSampleOut = project.layers?.sport365Commentary?.lines?.[0]?.text?.slice(0, 80) ?? "";
  console.log(`  Commentary lines: ${commLines}`);
  console.log(`  Sample: ${commSampleOut}`);
  if (commSampleOut.includes('"name":"Leeds"') || commSampleOut.includes("buildId")) {
    throw new Error("Sport365 commentary still looks like raw JSON — parser fix did not apply.");
  }

  if (!project.layers?.optaPlayerData?.players?.length) {
    project = await step("Import WhoScored", () =>
      api("POST", "/api/match-report/import/opta-player-data", {
        projectId: PROJECT_ID,
        provider: "whoscored",
        url: SOURCES.whoscored,
      }).then((d) => d.project),
    );
  } else {
    console.log("\n▶ WhoScored already imported — skip");
  }

  if (!project.layers?.interviews?.length) {
    project = await step("Import YouTube interview (Apify)", () =>
      api("POST", "/api/match-report/import/interview", {
        projectId: PROJECT_ID,
        url: SOURCES.youtube,
      }).then((d) => d.project),
    );
  } else {
    console.log("\n▶ YouTube interview already imported — skip");
  }

  if (!project.playerIntelligence?.ratings?.length) {
    project = await step("Player intelligence", () =>
      api("POST", "/api/match-report/player-intelligence", { projectId: PROJECT_ID }).then((d) => d.project),
    );
  } else {
    console.log(`\n▶ Player intelligence present (${project.playerIntelligence.ratings.length} ratings) — skip`);
  }

  if (!project.eventPicture) {
    project = await step("Build picture", () =>
      api("POST", "/api/match-report/build-picture", { projectId: PROJECT_ID }).then((d) => d.project),
    );
  } else {
    console.log("\n▶ Event picture already built — skip");
  }

  if (!project.mediaOutputs?.reportHtml) {
    const kick = await step("Generate media (AI report)", () =>
      api("POST", "/api/match-report/generate-media", {
        projectId: PROJECT_ID,
        includeSixteenConclusions: false,
      }),
    );
    if (kick.async && kick.jobId) {
      await pollJob(kick.jobId, "Media builder");
      project = await api("GET", `/api/match-report/projects/${PROJECT_ID}`);
    } else {
      project = kick.project;
    }
  } else {
    console.log("\n▶ Media outputs already present — skip generation");
  }

  const report = project.mediaOutputs;
  if (!report?.headline || !report?.reportHtml) {
    throw new Error("Media outputs missing headline or reportHtml after generation.");
  }

  const words = wordCount(report.reportHtml);
  const ratingsWords = wordCount(report.playerRatingsHtml);
  const piCount = project.playerIntelligence?.ratings?.length ?? 0;

  console.log("\n=== RESULT ===");
  console.log(`Headline: ${report.headline}`);
  console.log(`Report words: ${words}${words >= 600 && words <= 1200 ? " ✓ (target range)" : words >= 500 ? " (~OK)" : " ⚠ below target"}`);
  console.log(`Player ratings block words: ${ratingsWords} (${piCount} players)`);
  console.log(`Workflow step: ${project.workflowStep}`);
  console.log(`Interviews: ${project.layers?.interviews?.length ?? 0}`);

  const outDir = path.join(ROOT, "data", "local", "e2e-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${PROJECT_ID}-report.html`);
  fs.writeFileSync(
    outFile,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.headline}</title></head><body>${report.reportHtml}${report.playerRatingsHtml || ""}</body></html>`,
    "utf-8",
  );
  console.log(`Saved: ${outFile}`);

  if (words < 400) {
    process.exitCode = 1;
    console.error("\nReport word count too low — may need more source data or prompt tuning.");
  }
}

main().catch((err) => {
  console.error("\nE2E failed:", err.message);
  process.exit(1);
});
