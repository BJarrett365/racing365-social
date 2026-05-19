import type { ContentFormat } from "@/types";

/** Human labels in the editor / preview UI (internal scene ids unchanged). */
export function sceneDisplayLabel(format: ContentFormat, sceneId: string): string {
  if (format === "fast-results") {
    if (sceneId === "winner") return "Winner";
    if (sceneId === "placings") return "Top four";
  }
  if (format === "teamtalk-news") {
    if (sceneId === "intro") return "intro";
    if (sceneId === "winner") return "News 1";
    if (sceneId === "placings") return "News 2";
    if (sceneId === "outro") return "outro";
  }
  if (format === "f1-grid") {
    if (sceneId === "intro") return "Intro";
    if (sceneId === "grid1") return "Grid 1";
    if (sceneId === "grid2") return "Grid 2";
    if (sceneId === "outro") return "Outro";
  }
  if (format === "f1-results") {
    if (sceneId === "intro") return "Intro";
    if (sceneId === "results1") return "Results 1";
    if (sceneId === "results2") return "Results 2";
    if (sceneId === "outro") return "Outro";
  }
  if (format === "news-shorts") {
    if (sceneId === "slide-1") return "Intro";
    if (sceneId === "slide-2") return "Content 1";
    if (sceneId === "slide-3") return "Content 2";
    if (sceneId === "slide-4") return "Outro";
  }
  if (format === "planet-rugby-table" || format === "planet-football-table") {
    if (sceneId === "intro") return "Intro";
    if (sceneId === "outro") return "Outro";
    const m = /^table-(\d+)$/.exec(sceneId);
    if (m) return `Table ${m[1]}`;
  }
  return sceneId;
}
