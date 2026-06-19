import fs from "fs/promises";
import path from "path";

export const F1_DRIVER_PLACEHOLDER = "/grid/drivers/placeholder.svg";

/** SDMS slug → Formula 1 CDN 2026 portrait asset prefix (without view suffix). */
export const F1_DRIVER_IMAGE_SLUGS = [
  "max-verstappen",
  "kimi-antonelli",
  "george-russell",
  "charles-leclerc",
  "lewis-hamilton",
  "lando-norris",
  "oscar-piastri",
  "pierre-gasly",
  "franco-colapinto",
  "fernando-alonso",
  "lance-stroll",
  "oliver-bearman",
  "esteban-ocon",
  "gabriel-bortoleto",
  "nico-hulkenberg",
  "valtteri-bottas",
  "sergio-perez",
  "alex-albon",
  "carlos-sainz",
  "liam-lawson",
  "arvid-lindblad",
  "isack-hadjar",
] as const;

export function f1DriverImageRel(driverSlug: string | undefined): string | undefined {
  const s = (driverSlug ?? "").trim();
  if (!s) return undefined;
  return `/grid/drivers/${s}.png`;
}

export async function resolvePublicImageDataUrl(raw: unknown): Promise<string | undefined> {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (v.startsWith("data:image/")) return v;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!v.startsWith("/")) return v;

  const rel = v.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await fs.access(abs);
  } catch {
    return v;
  }
  const buf = await fs.readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".svg"
            ? "image/svg+xml"
            : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function resolveF1DriverRowImages(rows: unknown[]): Promise<unknown[]> {
  return Promise.all(
    rows.map(async (d) => {
      if (!d || typeof d !== "object") return d;
      const o = d as Record<string, unknown>;
      const raw = typeof o.image === "string" ? o.image.trim() : "";
      const imagePath = raw || F1_DRIVER_PLACEHOLDER;
      let img = await resolvePublicImageDataUrl(imagePath);
      if (typeof img !== "string" || !img.startsWith("data:")) {
        img = (await resolvePublicImageDataUrl(F1_DRIVER_PLACEHOLDER)) ?? "";
      }
      return img ? { ...o, image: img } : o;
    }),
  );
}

/** Inline `/grid/drivers/…` paths as data URLs for headless render and live preview. */
export async function resolveF1TemplateDataForRender(
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let out: Record<string, unknown> = { ...data };
  const logoRaw = out.logoUrl;
  if (typeof logoRaw === "string" && logoRaw.trim().startsWith("/")) {
    const logo = await resolvePublicImageDataUrl(logoRaw);
    if (typeof logo === "string" && logo.startsWith("data:")) {
      out = { ...out, logoUrl: logo };
    }
  }
  const gridDrivers = out.gridDrivers;
  if (Array.isArray(gridDrivers)) {
    out = { ...out, gridDrivers: await resolveF1DriverRowImages(gridDrivers) };
  }
  const resultDrivers = out.resultDrivers;
  if (Array.isArray(resultDrivers)) {
    out = { ...out, resultDrivers: await resolveF1DriverRowImages(resultDrivers) };
  }
  const fl = out.fastestLap;
  if (fl && typeof fl === "object") {
    const o = fl as Record<string, unknown>;
    const raw = typeof o.image === "string" ? o.image.trim() : "";
    const imagePath = raw || F1_DRIVER_PLACEHOLDER;
    let img = await resolvePublicImageDataUrl(imagePath);
    if (typeof img !== "string" || !img.startsWith("data:")) {
      img = (await resolvePublicImageDataUrl(F1_DRIVER_PLACEHOLDER)) ?? "";
    }
    out = { ...out, fastestLap: img ? { ...o, image: img } : o };
  }
  return out;
}
