export interface SubtitleCue {
  startSec: number;
  endSec: number;
  text: string;
}

function pad(n: number, w: number) {
  return String(Math.floor(n)).padStart(w, "0");
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ms = Math.round((sec % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${String(ms).padStart(3, "0")}`;
}

export function cuesFromScenes(
  scenes: { durationSec: number; caption: string }[],
): SubtitleCue[] {
  let t = 0;
  return scenes.map((s) => {
    const start = t;
    const end = t + s.durationSec;
    t = end;
    return { startSec: start, endSec: end, text: s.caption };
  });
}

export function buildSrt(cues: SubtitleCue[]): string {
  return cues
    .map((c, i) => {
      const start = formatSrtTime(c.startSec);
      const end = formatSrtTime(c.endSec);
      const text = c.text.replace(/\n/g, " ").trim();
      return `${i + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
}
