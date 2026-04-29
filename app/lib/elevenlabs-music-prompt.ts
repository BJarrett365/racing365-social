/**
 * ElevenLabs Music (`POST /v1/music`) prompt helpers for News Shorts backing tracks.
 */

export type MusicPresetId =
  | "breaking-news"
  | "sports-pulse"
  | "motorsport-racing"
  | "tech-modern"
  | "calm-ambient"
  | "investigative"
  | "lifestyle-warm"
  | "custom";

export type MusicPromptInput = {
  presetId: MusicPresetId;
  mood?: string;
  energy?: string;
  tempo?: string;
  genre?: string;
  extraPrompt?: string;
};

const PRESET_BASE: Record<Exclude<MusicPresetId, "custom">, string> = {
  "breaking-news":
    "Urgent newsroom underscore: tight low-mid pulse, subtle rhythmic tension, light percussive drive, cinematic news sting energy without overpowering voice.",
  "sports-pulse":
    "High-energy sports broadcast bed: driving drums, stadium swell, punchy bass, occasional brass hits—keeps momentum under commentary.",
  "motorsport-racing":
    "Motorsport broadcast underscore: fast hi-hats, aggressive synth bass, racing tension, subtle engine-like textures, heroic build—stays under narration.",
  "tech-modern":
    "Clean tech / modern news bed: airy pads, light arpeggios, crisp transient clicks, minimal melodic hooks, futuristic but restrained.",
  "calm-ambient":
    "Soft ambient news bed: warm pads, gentle motion, very light rhythm, unobtrusive and spacious for long reads.",
  investigative:
    "Investigative documentary underscore: low strings, muted pulses, subtle suspense, serious tone—no cheesy horror stings.",
  "lifestyle-warm":
    "Warm lifestyle / human-interest bed: acoustic-inspired layers, soft groove, optimistic but not sugary.",
};

export const ELEVENLABS_MUSIC_PRESET_OPTIONS: ReadonlyArray<{ id: MusicPresetId; label: string }> = [
  { id: "breaking-news", label: "Breaking News" },
  { id: "sports-pulse", label: "Sports Pulse" },
  { id: "motorsport-racing", label: "Motorsport / Racing" },
  { id: "tech-modern", label: "Tech / Modern" },
  { id: "calm-ambient", label: "Calm Ambient" },
  { id: "investigative", label: "Investigative" },
  { id: "lifestyle-warm", label: "Lifestyle Warm" },
  { id: "custom", label: "Custom (prompt only)" },
];

export const MUSIC_MOOD_OPTIONS = ["neutral", "urgent", "tense", "calm", "hopeful", "dramatic"] as const;
export const MUSIC_ENERGY_OPTIONS = ["low", "medium", "high"] as const;
export const MUSIC_TEMPO_OPTIONS = ["slow", "moderate", "fast", "driving"] as const;

function isPresetId(s: string): s is MusicPresetId {
  return ELEVENLABS_MUSIC_PRESET_OPTIONS.some((o) => o.id === s);
}

export function parseMusicPresetId(raw: string | undefined): MusicPresetId {
  const s = (raw ?? "").trim();
  if (s && isPresetId(s)) return s;
  return "breaking-news";
}

/** Builds a single English prompt for `POST /v1/music` (compose). */
export function buildElevenLabsMusicPrompt(input: MusicPromptInput): string {
  const parts: string[] = [];
  if (input.presetId !== "custom") {
    parts.push(PRESET_BASE[input.presetId]);
  }
  const mood = input.mood?.trim();
  const energy = input.energy?.trim();
  const tempo = input.tempo?.trim();
  const genre = input.genre?.trim();
  if (mood) parts.push(`Overall mood: ${mood}.`);
  if (energy) parts.push(`Energy level: ${energy}.`);
  if (tempo) parts.push(`Tempo feel: ${tempo}.`);
  if (genre) parts.push(`Genre or instrumentation lean: ${genre}.`);
  const extra = input.extraPrompt?.trim();
  if (extra) parts.push(extra);
  if (parts.length === 0) {
    return "Neutral modern news underscore: light rhythm, subtle pads, designed to sit under spoken narration.";
  }
  parts.push("Mix as a background bed under voice; avoid busy melodies and competing lead lines.");
  return parts.join(" ");
}
