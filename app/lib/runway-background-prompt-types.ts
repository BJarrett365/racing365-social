export type RunwayBgBrand = "Racing365" | "TEAMtalk" | "PlanetF1";

export type RunwaySubtitleCue = {
  start: number;
  end: number;
  text: string;
};

export type RunwayBgSettings = {
  duration: number;
  aspect_ratio: string;
  resolution: string;
  camera_motion: string;
  loop: boolean;
  style: string;
  quality: string;
};

export type RunwayBackgroundPromptResult = {
  runway_prompt: string;
  settings: RunwayBgSettings;
  filename: string;
  subtitles: RunwaySubtitleCue[];
  formatted: string;
};
