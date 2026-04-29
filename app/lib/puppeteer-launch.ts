import fs from "fs";
import path from "path";
import type { LaunchOptions } from "puppeteer";

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MAC_CHROMIUM = "/Applications/Chromium.app/Contents/MacOS/Chromium";

/**
 * Cursor/sandbox runs can point Puppeteer at a temp cache with no downloaded browser.
 * Pin cache to the real home directory before the puppeteer module resolves paths.
 */
export function normalizePuppeteerCacheDir(): void {
  if (process.env.PUPPETEER_CACHE_DIR) return;
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    process.env.PUPPETEER_CACHE_DIR = path.join(home, ".cache", "puppeteer");
  }
}

const DEFAULT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--font-render-hinting=none",
] as const;

/** Resolution: env path → macOS Chrome/Chromium → Windows Chrome → `channel: chrome` → bundled (cache). */
export function getPuppeteerLaunchOptions(): LaunchOptions {
  const args = [...DEFAULT_ARGS];
  const envExe = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envExe && fs.existsSync(envExe)) {
    return { headless: true, executablePath: envExe, args };
  }
  if (process.platform === "darwin") {
    if (fs.existsSync(MAC_CHROME)) {
      return { headless: true, executablePath: MAC_CHROME, args };
    }
    if (fs.existsSync(MAC_CHROMIUM)) {
      return { headless: true, executablePath: MAC_CHROMIUM, args };
    }
  }
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(
        process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe",
      ),
      process.env.LOCALAPPDATA
        ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
        : "",
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        return { headless: true, executablePath: p, args };
      }
    }
  }
  return { headless: true, channel: "chrome", args };
}

export async function loadPuppeteer() {
  normalizePuppeteerCacheDir();
  const mod = await import("puppeteer");
  return mod.default;
}
