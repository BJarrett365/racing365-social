export type F1DriverNameFormat = "full" | "initial" | "surname";

export type F1ResultsLayoutMetrics = {
  boardStyle: string;
  nameFontPx: number;
  nameColPx: number;
};

const CHAR_WIDTH_RATIO = 0.56;
const ABS_MIN_NAME_FONT_PX = 18;

export function splitF1DriverName(raw: string): { first: string; last: string } {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return { first: "", last: "DRIVER" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { first: "", last: parts[0]! };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export function formatF1DriverName(
  raw: string,
  format: F1DriverNameFormat,
): string {
  const { first, last } = splitF1DriverName(raw);
  if (format === "full") {
    return (first ? `${first} ${last}` : last).trim();
  }
  if (format === "initial" && first) {
    return `${first.charAt(0)}. ${last}`;
  }
  return last;
}

export function estimateF1NameWidthPx(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * CHAR_WIDTH_RATIO;
}

function scalePx(n: number, h: number): number {
  return Math.round((n * h) / 1350);
}

function bestFormatForWidth(
  raw: string,
  widthPx: number,
  fontSizePx: number,
): F1DriverNameFormat | null {
  const modes: F1DriverNameFormat[] = ["full", "initial", "surname"];
  for (const mode of modes) {
    const display = formatF1DriverName(raw, mode).toUpperCase();
    if (estimateF1NameWidthPx(display, fontSizePx) <= widthPx) {
      return mode;
    }
  }
  return null;
}

/** Pick one font size + format mode so every name on the page fits without ellipsis. */
export function computeF1ResultsLayout(
  w: number,
  h: number,
  driverNames: string[],
): F1ResultsLayoutMetrics {
  const forePad = scalePx(22, h) * 2;
  const boardWidth = Math.max(320, w - forePad);

  const posW = scalePx(56, h);
  const stopsW = scalePx(52, h);
  const timeW = scalePx(136, h);
  const photoW = scalePx(58, h);
  const nameColPx = Math.max(scalePx(180, h), boardWidth - posW - stopsW - timeW - photoW);

  const faceSize = scalePx(66, h);
  const maxFontPx = scalePx(36, h);
  const minFontPx = Math.max(ABS_MIN_NAME_FONT_PX, scalePx(18, h));

  const names = driverNames.length > 0 ? driverNames : ["DRIVER"];

  let nameFontPx = minFontPx;

  for (let font = maxFontPx; font >= minFontPx; font -= 1) {
    const allFit = names.every((name) => bestFormatForWidth(name, nameColPx, font) !== null);
    if (allFit) {
      nameFontPx = font;
      break;
    }
  }

  const boardStyle = [
    `--f1-name-col:${nameColPx}px`,
    `--f1-name-font:${nameFontPx}px`,
    `--f1-photo-col:${photoW}px`,
    `--f1-face-size:${faceSize}px`,
    `--f1-time-col:${timeW}px`,
  ].join(";");

  return { boardStyle, nameFontPx, nameColPx };
}

export function displayF1ResultsDriverName(
  raw: string,
  layout: F1ResultsLayoutMetrics,
): string {
  const modes: F1DriverNameFormat[] = ["full", "initial", "surname"];
  for (const mode of modes) {
    const display = formatF1DriverName(raw, mode).toUpperCase();
    if (estimateF1NameWidthPx(display, layout.nameFontPx) <= layout.nameColPx) {
      return display;
    }
  }
  return formatF1DriverName(raw, "surname").toUpperCase();
}
