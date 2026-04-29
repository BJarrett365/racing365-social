/**
 * Football Line Ups — 1080×1920 boards: pitch + bench + injuries.
 * Integrates editor backdrop / transparent flags like racing templates.
 */

type SceneData = Record<string, unknown>;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function editorCompositorImgFootball(data: SceneData): string {
  const u = data.editorCompositorImageUrl;
  if (typeof u !== "string" || !u.startsWith("data:image/")) return "";
  return `<img class="editor-compositor-layer" src="${esc(u)}" alt="" />`;
}

type Starter = { n: number; name: string; x: number; y: number; gk?: boolean; surname?: string };

function normStarter(p: unknown): Starter | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const n = typeof o.n === "number" ? o.n : Number(o.n);
  const name = String(o.name ?? "").trim();
  const x = typeof o.x === "number" ? o.x : Number(o.x);
  const y = typeof o.y === "number" ? o.y : Number(o.y);
  if (!name && !(Number.isFinite(n) && n > 0)) return null;
  const sur = typeof o.surname === "string" ? String(o.surname).trim() : "";
  return {
    n: Number.isFinite(n) ? n : 0,
    name: String(o.name ?? ""),
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
    gk: o.gk === true,
    surname: sur || undefined,
  };
}

type BenchRowNorm = { n: number; name: string; surname?: string; position?: string };

function normBenchRow(p: unknown): BenchRowNorm | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const n = typeof o.n === "number" ? o.n : Number(o.n);
  const name = String(o.name ?? "").trim();
  const sur = typeof o.surname === "string" ? String(o.surname).trim() : "";
  const pos = typeof o.position === "string" ? String(o.position).trim() : "";
  if (!name && !(Number.isFinite(n) && n > 0)) return null;
  return {
    n: Number.isFinite(n) ? n : 0,
    name: String(o.name ?? ""),
    surname: sur || undefined,
    position: pos || undefined,
  };
}

function benchRowIsGk(row: BenchRowNorm): boolean {
  const p = (row.position ?? "").trim().toUpperCase();
  return p === "GK" || p.startsWith("GK ") || p.includes("GOALKEEP");
}

type FbNavTab = "home-lineup" | "away-lineup" | "bench" | "availability";

function renderFootballNavHeader(
  league: string,
  matchCodeLine: string,
  matchDate: string,
  kickoff: string,
  active: FbNavTab,
): string {
  const tab = (id: FbNavTab, label: string) =>
    `<span class="fb-nav-tab${active === id ? " fb-nav-tab--on" : ""}">${esc(label)}</span>`;
  return `<header class="fb-top">
    <div class="fb-league-tag">${esc(league)}</div>
    <div class="fb-match-code">${esc(matchCodeLine)}</div>
    <div class="fb-match-when">${esc(matchDate)} · ${esc(kickoff)}</div>
    <nav class="fb-nav-tabs" aria-label="Board sections">
      ${tab("home-lineup", "HOME LINEUP")}
      ${tab("away-lineup", "AWAY LINEUP")}
      ${tab("bench", "BENCH")}
      ${tab("availability", "AVAILABILITY")}
    </nav>
  </header>`;
}

function footballMatchCodeFromData(data: SceneData, homeName: string, awayName: string): string {
  const raw = data.matchCodeLine;
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  const a = homeName.trim().split(/\s+/)[0] ?? "?";
  const b = awayName.trim().split(/\s+/)[0] ?? "?";
  return `${a.slice(0, 3).toUpperCase()} vs ${b.slice(0, 3).toUpperCase()}`;
}

function availabilityDetailClass(detail: string): string {
  const lower = detail.trim().toLowerCase();
  if (lower.includes("suspend")) return "fb-status-line fb-status-line--suspended";
  return "fb-status-line fb-status-line--injured";
}

type IssueRowNorm = { n: number; name: string; detail: string; surname?: string };

function normIssue(p: unknown): IssueRowNorm | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  const detail = String(o.detail ?? "").trim();
  const nRaw = typeof o.n === "number" ? o.n : Number(o.n);
  const n = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : 0;
  const sur = typeof o.surname === "string" ? String(o.surname).trim() : "";
  if (!name && !detail && n === 0) return null;
  return {
    n,
    name: String(o.name ?? ""),
    detail: String(o.detail ?? ""),
    surname: sur || undefined,
  };
}

function wrapFootballShell(
  title: string,
  inner: string,
  w: number,
  h: number,
  data: SceneData,
  shellExtraCss: string,
): string {
  const transparent = Boolean(data.editorTransparentBackground);
  const url = data.editorBackgroundImageUrl as string | undefined;
  const hasBgImg = Boolean(url) && !transparent;
  const bodyMod = transparent ? " fb-transparent" : "";

  const baseBody = transparent
    ? "background:transparent;"
    : hasBgImg
      ? "background:#000;"
      : "background:#0b0e14;";

  const comp = editorCompositorImgFootball(data);
  const backdropBlock = hasBgImg
    ? `<img class="fb-editor-bg" src="${esc(url)}" alt="" /><div class="fb-editor-dim" aria-hidden="true"></div>${comp}`
    : comp;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { margin: 0; }
    body.fb-shell {
      width: ${w}px;
      height: ${h}px;
      position: relative;
      overflow: hidden;
      ${baseBody}
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    body.fb-shell .fb-editor-bg {
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      z-index: 0;
    }
    body.fb-shell .fb-editor-dim {
      position: absolute;
      inset: 0;
      background: rgba(8, 12, 22, 0.82);
      z-index: 1;
      pointer-events: none;
    }
    body.fb-shell .editor-compositor-layer {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 2;
      pointer-events: none;
    }
    body.fb-shell .fb-root {
      position: relative;
      z-index: 3;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    body.fb-shell.fb-transparent .fb-top {
      background: linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.4) 100%);
    }
    body.fb-shell.fb-transparent .fb-pitch-wrap {
      background: transparent;
    }
    body.fb-shell.fb-transparent .fb-pitch {
      background: transparent;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22), 0 10px 28px rgba(0,0,0,0.3);
    }
    body.fb-shell.fb-transparent .fb-pitch-3d {
      perspective: 800px;
    }
    body.fb-shell.fb-transparent .fb-row-card {
      background: rgba(22, 28, 38, 0.72);
    }
    body.fb-shell.fb-transparent .fb-formation-pill {
      background: rgba(22, 28, 38, 0.75);
    }
    ${shellExtraCss}
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body class="fb-shell${bodyMod}">${backdropBlock}<div class="fb-root">${inner}</div></body></html>`;
}

function renderPitchLines(): string {
  return `<svg class="fb-pitch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="0.35"/>
    <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.85)" stroke-width="0.28"/>
    <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="0.28"/>
    <rect x="18" y="0" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="0.28"/>
    <rect x="28" y="0" width="44" height="9" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="0.22"/>
    <rect x="18" y="78" width="64" height="22" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="0.28"/>
    <rect x="28" y="91" width="44" height="9" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="0.22"/>
  </svg>`;
}

/** Back-of-shirt template: yoke, sleeves, fabric shading, white collar & cuff stripes */
function renderJerseySvg(bodyHex: string, sleeveHex: string, trimHex: string): string {
  const body = esc(bodyHex);
  const sleeve = esc(sleeveHex);
  const trim = esc(trimHex);
  return `<svg class="fb-jersey-svg" viewBox="0 0 100 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- shoulder / sleeve panels (trim colour) -->
    <path fill="${sleeve}" d="M14 36 L28 22 L34 28 L22 42 Z"/>
    <path fill="${sleeve}" d="M86 36 L72 22 L66 28 L78 42 Z"/>
    <!-- main back panel -->
    <path fill="${body}" d="M50 18 C40 18 30 22 24 30 L12 44 L10 56 L10 66 L20 64 L24 50 L28 50 L28 110 C28 118 38 124 50 124 C62 124 72 118 72 110 L72 50 L76 50 L80 64 L90 66 L90 56 L88 44 L76 30 C70 22 60 18 50 18 Z"/>
    <!-- side fold shading -->
    <path fill="rgba(0,0,0,0.16)" d="M24 30 L32 30 L32 112 L26 112 L24 48 Z"/>
    <path fill="rgba(0,0,0,0.16)" d="M76 30 L68 30 L68 112 L74 112 L76 48 Z"/>
    <!-- centre highlight -->
    <path fill="rgba(255,255,255,0.1)" d="M40 26 L60 26 L58 118 L42 118 Z"/>
    <!-- collar ring (inner neck) -->
    <path fill="none" stroke="${trim}" stroke-width="1.15" stroke-linecap="round" d="M36 24 Q50 16 64 24"/>
    <!-- sleeve cuff double stripes (back view) -->
    <path fill="none" stroke="${trim}" stroke-width="0.95" stroke-linecap="round" d="M8 54 L20 56 M8 58 L20 60"/>
    <path fill="none" stroke="${trim}" stroke-width="0.95" stroke-linecap="round" d="M92 54 L80 56 M92 58 L80 60"/>
  </svg>`;
}

/** Label under shirt: explicit surname or last token of full name */
function surnameForPitch(p: Starter): string {
  if (p.surname?.trim()) return p.surname.trim();
  const parts = p.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts[parts.length - 1] ?? "";
}

function surnameFontSizePx(surname: string): number {
  const n = surname.length;
  if (n <= 8) return 24;
  if (n <= 12) return 20;
  if (n <= 16) return 18;
  return 16;
}

/** Collar / cuff stripes: white on dark kits, dark on light kits */
function hexLuminance(hex: string): number {
  const m = hex.trim().replace(/^#/, "").match(/^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return 0.35;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function defaultTrimForBody(bodyHex: string): string {
  return hexLuminance(bodyHex) > 0.62 ? "#0f172a" : "#ffffff";
}

function kitFromSceneData(data: SceneData, side: "home" | "away"): KitStyle {
  const home = side === "home";
  const shirt = String(
    data[home ? "homeShirtColor" : "awayShirtColor"] ?? (home ? "#c41e2a" : "#f8fafc"),
  );
  const num = String(
    data[home ? "homeNumberColor" : "awayNumberColor"] ?? (home ? "#ffffff" : "#0f172a"),
  );
  const sleeve = String(data[home ? "homeSleeveColor" : "awaySleeveColor"] ?? "#f8fafc");
  const gkBody = String(
    data[home ? "homeGkShirtColor" : "awayGkShirtColor"] ?? "#00c8d4",
  );
  const trimKey = home ? "homeTrimColor" : "awayTrimColor";
  const rawTrim = data[trimKey];
  const trim =
    typeof rawTrim === "string" && rawTrim.trim().length > 0
      ? rawTrim.trim()
      : defaultTrimForBody(shirt);
  return {
    outfieldBody: shirt,
    sleeve,
    number: num,
    gkBody,
    trim,
  };
}

function surnameLabelForRow(name: string, surname?: string): string {
  if (surname?.trim()) return surname.trim();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[parts.length - 1] ?? "") : "";
}

/** Bench row: jersey left, surname + position right (reference UI) */
function renderBenchRowWide(row: BenchRowNorm, kit: KitStyle): string {
  const gk = benchRowIsGk(row);
  const bodyHex = gk ? kit.gkBody : kit.outfieldBody;
  const svg = renderJerseySvg(bodyHex, kit.sleeve, kit.trim);
  const sur = surnameLabelForRow(row.name, row.surname);
  const surEsc = esc(sur.toUpperCase());
  const pos = (row.position ?? "").trim().toUpperCase();
  const showNum = Number.isFinite(row.n) && row.n > 0;
  return `<div class="fb-row-card">
    <div class="fb-row-card__kit">
      <div class="fb-jersey-stack fb-jersey-stack--row">
        ${svg}
        ${
          showNum
            ? `<span class="fb-shirt-num--row" style="color:${esc(kit.number)}">${esc(row.n)}</span>`
            : ""
        }
      </div>
    </div>
    <div class="fb-row-card__meta">
      ${sur ? `<div class="fb-row-card__name">${surEsc}</div>` : ""}
      ${pos ? `<div class="fb-row-card__pos">${esc(pos)}</div>` : ""}
    </div>
  </div>`;
}

function renderAvailabilityRow(r: IssueRowNorm, kit: KitStyle): string {
  const svg = renderJerseySvg(kit.outfieldBody, kit.sleeve, kit.trim);
  const sur = surnameLabelForRow(r.name, r.surname);
  const surEsc = esc(sur.toUpperCase());
  const detail = String(r.detail ?? "").trim();
  const showNum = Number.isFinite(r.n) && r.n > 0;
  const statusClass = detail ? availabilityDetailClass(detail) : "fb-status-line fb-status-line--injured";
  return `<div class="fb-row-card fb-row-card--avail">
    <div class="fb-row-card__kit">
      <div class="fb-jersey-stack fb-jersey-stack--row">
        ${svg}
        ${
          showNum
            ? `<span class="fb-shirt-num--row" style="color:${esc(kit.number)}">${esc(r.n)}</span>`
            : ""
        }
      </div>
    </div>
    <div class="fb-row-card__meta">
      ${sur ? `<div class="fb-row-card__name">${surEsc}</div>` : ""}
      ${
        detail
          ? `<div class="${statusClass}">${esc(detail)}</div>`
          : ""
      }
    </div>
  </div>`;
}

type KitStyle = {
  outfieldBody: string;
  sleeve: string;
  number: string;
  gkBody: string;
  /** Collar & cuff stripes (usually white) */
  trim: string;
};

function renderPlayerPin(p: Starter, kit: KitStyle): string {
  const bodyHex = p.gk ? kit.gkBody : kit.outfieldBody;
  const svg = renderJerseySvg(bodyHex, kit.sleeve, kit.trim);
  const sur = surnameForPitch(p);
  const surEsc = esc(sur.toUpperCase());
  const surPx = surnameFontSizePx(sur);
  const nameBelow =
    sur.trim().length > 0
      ? `<div class="fb-name-below" style="font-size:${surPx}px">${surEsc}</div>`
      : "";
  return `<div class="fb-pin" style="left:${p.x}%;top:${p.y}%;">
    <div class="fb-jersey-stack">
      ${svg}
      <span class="fb-shirt-num" style="color:${esc(kit.number)}">${esc(p.n)}</span>
    </div>
    ${nameBelow}
  </div>`;
}

/** Shared header + nav (reference: dark shell, cyan accents, tab glow) */
const FOOTBALL_UI_SHARED_CSS = `
  .fb-top {
    flex-shrink: 0;
    padding: 26px 18px 6px;
    text-align: center;
  }
  .fb-league-tag {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.22em;
    color: #00d4e8;
    text-transform: uppercase;
    display: inline-block;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.9);
  }
  .fb-match-code {
    margin-top: 14px;
    font-size: 44px;
    font-weight: 900;
    letter-spacing: 0.02em;
    color: #ffffff;
    line-height: 1.05;
    display: inline-block;
    padding: 8px 14px;
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.9);
  }
  .fb-match-when {
    margin-top: 10px;
    font-size: 16px;
    color: #8b93a3;
    font-weight: 500;
    display: inline-block;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.86);
  }
  .fb-nav-tabs {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 22px;
    padding: 0 8px 8px;
  }
  .fb-nav-tab {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.07em;
    color: #64748b;
    padding: 11px 12px;
    border-radius: 10px;
    border: 2px solid transparent;
    white-space: nowrap;
  }
  .fb-nav-tab--on {
    color: #0b0e14;
    background: linear-gradient(180deg, #00f0ff 0%, #00c8d4 100%);
    border-color: rgba(0, 240, 255, 0.9);
    box-shadow:
      0 0 20px rgba(0, 232, 245, 0.5),
      0 0 2px rgba(0, 232, 245, 0.95);
  }
  .fb-board-section-title {
    flex-shrink: 0;
    text-align: center;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: #fff;
    padding: 10px 16px 14px;
    text-transform: uppercase;
    width: fit-content;
    margin: 0 auto;
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.9);
  }
  .fb-columns {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 0;
    padding: 8px 20px 28px;
    overflow: hidden;
  }
  .fb-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .fb-col + .fb-col {
    border-left: 1px solid rgba(55, 65, 85, 0.55);
    padding-left: 18px;
    margin-left: 10px;
  }
  .fb-col-h {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #00d4e8;
    margin-bottom: 12px;
    text-align: center;
    text-transform: uppercase;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(55, 65, 85, 0.5);
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 12px;
    padding: 6px 10px 7px;
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.88);
  }
  .fb-bench-rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }
  .fb-columns--scroll {
    align-items: flex-start;
    overflow-y: auto;
  }
  .fb-row-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 10px 12px 10px 10px;
    border-radius: 12px;
    background: rgba(26, 31, 43, 0.92);
    border: 1px solid rgba(70, 82, 104, 0.45);
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
  }
  .fb-row-card--avail {
    align-items: center;
  }
  .fb-row-card__kit {
    flex-shrink: 0;
  }
  .fb-jersey-stack--row {
    position: relative;
    width: 52px;
    height: 60px;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45));
  }
  .fb-jersey-stack--row .fb-jersey-svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .fb-shirt-num--row {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 17px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
  .fb-row-card__meta {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  .fb-row-card__name {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #f1f5f9;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .fb-row-card__pos {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #8b93a3;
    letter-spacing: 0.04em;
  }
  .fb-status-line {
    margin-top: 5px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .fb-status-line--injured {
    color: #f87171;
  }
  .fb-status-line--suspended {
    color: #facc15;
  }
`;

const BOARD1_CSS =
  FOOTBALL_UI_SHARED_CSS +
  `
  .fb-lineup-team-title {
    flex-shrink: 0;
    text-align: center;
    font-size: 42px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: #fff;
    text-transform: uppercase;
    padding: 8px 20px 6px;
    line-height: 1.15;
    width: fit-content;
    margin: 0 auto;
    border-radius: 12px;
    background: rgba(2, 6, 23, 0.9);
  }
  .fb-pitch-wrap {
    flex: 1;
    min-height: 0;
    padding: 4px 12px 10px;
    position: relative;
    background: radial-gradient(ellipse 95% 90% at 50% 42%, #1a5c32 0%, #0e3018 52%, #0b0e14 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .fb-pitch-3d {
    width: 100%;
    height: 100%;
    perspective: 1000px;
    perspective-origin: 50% 38%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 4%;
  }
  .fb-pitch {
    position: relative;
    width: 104%;
    height: 92%;
    border-radius: 18px;
    overflow: hidden;
    transform: rotateX(9deg) scale(0.99);
    transform-style: preserve-3d;
    transform-origin: 50% 46%;
    background: repeating-linear-gradient(
      0deg,
      #143d24 0px,
      #143d24 40px,
      #1a5230 40px,
      #1a5230 80px
    );
    box-shadow:
      0 22px 0 -2px #07140c,
      0 28px 36px rgba(0,0,0,0.6),
      inset 0 0 0 2px rgba(255,255,255,0.12);
  }
  .fb-pitch-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 16px;
  }
  .fb-pins {
    position: absolute;
    inset: 0;
    z-index: 2;
  }
  .fb-pin {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 360px;
  }
  .fb-jersey-stack {
    position: relative;
    width: 118px;
    height: 134px;
    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.55));
  }
  .fb-jersey-svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .fb-name-below {
    margin-top: 3px;
    max-width: 340px;
    padding: 5px 10px;
    text-align: center;
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1.2;
    text-transform: uppercase;
    color: #ffffff;
    text-shadow:
      0 1px 2px rgba(0,0,0,0.95),
      0 0 8px rgba(0,0,0,0.6);
    word-break: break-word;
    overflow-wrap: anywhere;
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.88);
  }
  .fb-shirt-num {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 38px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
    text-shadow: 0 2px 4px rgba(0,0,0,0.35);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
  .fb-formation-pill {
    flex-shrink: 0;
    align-self: center;
    margin: 0 auto 22px;
    padding: 18px 40px;
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.9);
    border: 1px solid rgba(90, 102, 122, 0.4);
    font-size: 32px;
    font-weight: 700;
    color: #e8ecf4;
    letter-spacing: 0.02em;
    max-width: 95%;
    text-align: center;
    line-height: 1.2;
  }
  .fb-pitch-wrap--half {
    display: flex;
    flex-direction: column;
  }
  .fb-pitch-viewport {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    width: 100%;
  }
  .fb-pitch-stack {
    position: absolute;
    left: 50%;
    top: 0;
    width: 106%;
    height: 200%;
    transform: translateX(-50%);
  }
  .fb-pitch-stack--away {
    transform: translateX(-50%) translateY(-50%);
  }
  .fb-pitch-stack .fb-pitch-3d {
    width: 100%;
    height: 100%;
    perspective: 1000px;
    perspective-origin: 50% 32%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 3%;
  }
  .fb-pitch-stack--away .fb-pitch-3d {
    perspective-origin: 50% 68%;
  }
  .fb-pitch-stack .fb-pitch {
    width: 106%;
    height: 94%;
  }
`;

const BOARD23_CSS = FOOTBALL_UI_SHARED_CSS;

export function tryRenderFootballTemplate(templateId: string, data: SceneData): string | null {
  const w = Number(data.width ?? 1080);
  const h = Number(data.height ?? 1920);

  if (templateId === "football-board-1") {
    const league = String(data.league ?? "");
    const matchDate = String(data.matchDate ?? "");
    const kickoff = String(data.kickoff ?? "");
    const homeName = String(data.homeName ?? "");
    const awayName = String(data.awayName ?? "");
    const homeForm = String(data.homeFormation ?? "");
    const awayForm = String(data.awayFormation ?? "");
    const rawHome = Array.isArray(data.homeStarters) ? data.homeStarters : [];
    const rawAway = Array.isArray(data.awayStarters) ? data.awayStarters : [];
    const homeStarters = rawHome.map(normStarter).filter(Boolean) as Starter[];
    const awayStarters = rawAway.map(normStarter).filter(Boolean) as Starter[];
    const homeShirt = String(data.homeShirtColor ?? "#c41e2a");
    const awayShirt = String(data.awayShirtColor ?? "#f8fafc");
    const homeNum = String(data.homeNumberColor ?? "#ffffff");
    const awayNum = String(data.awayNumberColor ?? "#0f172a");
    const homeSleeve = String(data.homeSleeveColor ?? "#f8fafc");
    const awaySleeve = String(data.awaySleeveColor ?? "#f8fafc");
    const homeGkBody = String(data.homeGkShirtColor ?? "#00c8d4");
    const awayGkBody = String(data.awayGkShirtColor ?? "#00c8d4");
    const homeTrim = String(data.homeTrimColor ?? defaultTrimForBody(homeShirt));
    const awayTrim = String(data.awayTrimColor ?? defaultTrimForBody(awayShirt));

    const halfRaw = data.lineupHalf;
    const lineupHalf: "full" | "home" | "away" =
      halfRaw === "home" || halfRaw === "away" ? halfRaw : "full";

    const homeKit: KitStyle = {
      outfieldBody: homeShirt,
      sleeve: homeSleeve,
      number: homeNum,
      gkBody: homeGkBody,
      trim: homeTrim,
    };
    const awayKit: KitStyle = {
      outfieldBody: awayShirt,
      sleeve: awaySleeve,
      number: awayNum,
      gkBody: awayGkBody,
      trim: awayTrim,
    };

    const pins =
      lineupHalf === "home"
        ? homeStarters.map((p) => renderPlayerPin(p, homeKit)).join("")
        : lineupHalf === "away"
          ? awayStarters.map((p) => renderPlayerPin(p, awayKit)).join("")
          : [
              ...homeStarters.map((p) => renderPlayerPin(p, homeKit)),
              ...awayStarters.map((p) => renderPlayerPin(p, awayKit)),
            ].join("");

    const pitchBlock =
      lineupHalf === "full"
        ? `<div class="fb-pitch-wrap">
        <div class="fb-pitch-3d">
          <div class="fb-pitch">
            ${renderPitchLines()}
            <div class="fb-pins">${pins}</div>
          </div>
        </div>
      </div>`
        : `<div class="fb-pitch-wrap fb-pitch-wrap--half">
        <div class="fb-pitch-viewport">
          <div class="fb-pitch-stack${lineupHalf === "away" ? " fb-pitch-stack--away" : ""}">
            <div class="fb-pitch-3d">
              <div class="fb-pitch">
                ${renderPitchLines()}
                <div class="fb-pins">${pins}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const matchCodeLine = footballMatchCodeFromData(data, homeName, awayName);
    const navActive: FbNavTab = lineupHalf === "away" ? "away-lineup" : "home-lineup";
    const headerBlock = renderFootballNavHeader(
      league,
      matchCodeLine,
      matchDate,
      kickoff,
      lineupHalf === "full" ? "home-lineup" : navActive,
    );

    const lineupTeamTitle =
      lineupHalf === "home"
        ? `<div class="fb-lineup-team-title">${esc(homeName)}</div>`
        : lineupHalf === "away"
          ? `<div class="fb-lineup-team-title">${esc(awayName)}</div>`
          : `<div class="fb-lineup-team-title">${esc(homeName)} · ${esc(awayName)}</div>`;

    const formationPill =
      lineupHalf === "home"
        ? `<div class="fb-formation-pill">${esc(homeName)} ${esc(homeForm)}</div>`
        : lineupHalf === "away"
          ? `<div class="fb-formation-pill">${esc(awayName)} ${esc(awayForm)}</div>`
          : `<div class="fb-formation-pill">${esc(homeName)} ${esc(homeForm)} · ${esc(awayForm)} ${esc(
              awayName,
            )}</div>`;

    const shellTitle =
      lineupHalf === "home"
        ? "football-lineups-board-1-home"
        : lineupHalf === "away"
          ? "football-lineups-board-1-away"
          : "football-lineups-board-1";

    const inner = `
      ${headerBlock}
      ${lineupTeamTitle}
      ${pitchBlock}
      ${formationPill}
    `;

    return wrapFootballShell(shellTitle, inner, w, h, data, BOARD1_CSS);
  }

  if (templateId === "football-board-2") {
    const league = String(data.league ?? "");
    const matchDate = String(data.matchDate ?? "");
    const kickoff = String(data.kickoff ?? "");
    const homeName = String(data.homeName ?? "");
    const awayName = String(data.awayName ?? "");
    const matchCodeLine = footballMatchCodeFromData(data, homeName, awayName);
    const homeBench = (Array.isArray(data.homeBench) ? data.homeBench : [])
      .map(normBenchRow)
      .filter(Boolean) as BenchRowNorm[];
    const awayBench = (Array.isArray(data.awayBench) ? data.awayBench : [])
      .map(normBenchRow)
      .filter(Boolean) as BenchRowNorm[];
    const homeKit = kitFromSceneData(data, "home");
    const awayKit = kitFromSceneData(data, "away");

    const col = (title: string, rows: BenchRowNorm[], kit: KitStyle) =>
      `<div class="fb-col">
        <div class="fb-col-h">${esc(title)}</div>
        <div class="fb-bench-rows">
          ${rows.map((r) => renderBenchRowWide(r, kit)).join("")}
        </div>
      </div>`;

    const inner = `
      ${renderFootballNavHeader(league, matchCodeLine, matchDate, kickoff, "bench")}
      <div class="fb-board-section-title">Bench players</div>
      <div class="fb-columns fb-columns--scroll">${col(homeName, homeBench, homeKit)}${col(
        awayName,
        awayBench,
        awayKit,
      )}</div>
    `;

    return wrapFootballShell("football-lineups-board-2", inner, w, h, data, BOARD23_CSS);
  }

  if (templateId === "football-board-3") {
    const league = String(data.league ?? "");
    const matchDate = String(data.matchDate ?? "");
    const kickoff = String(data.kickoff ?? "");
    const homeName = String(data.homeName ?? "");
    const awayName = String(data.awayName ?? "");
    const matchCodeLine = footballMatchCodeFromData(data, homeName, awayName);
    const homeIss = (Array.isArray(data.homeInjuries) ? data.homeInjuries : [])
      .map(normIssue)
      .filter(Boolean) as IssueRowNorm[];
    const awayIss = (Array.isArray(data.awayInjuries) ? data.awayInjuries : [])
      .map(normIssue)
      .filter(Boolean) as IssueRowNorm[];
    const homeKit = kitFromSceneData(data, "home");
    const awayKit = kitFromSceneData(data, "away");

    const colIssues = (title: string, rows: IssueRowNorm[], kit: KitStyle) =>
      `<div class="fb-col">
        <div class="fb-col-h">${esc(title)}</div>
        <div class="fb-bench-rows">
          ${rows.map((r) => renderAvailabilityRow(r, kit)).join("")}
        </div>
      </div>`;

    const inner = `
      ${renderFootballNavHeader(league, matchCodeLine, matchDate, kickoff, "availability")}
      <div class="fb-board-section-title">Injuries &amp; suspensions</div>
      <div class="fb-columns fb-columns--scroll">${colIssues(homeName, homeIss, homeKit)}${colIssues(
        awayName,
        awayIss,
        awayKit,
      )}</div>
    `;

    return wrapFootballShell("football-lineups-board-3", inner, w, h, data, BOARD23_CSS);
  }

  return null;
}
