import type { TemplateFieldAnimation } from "@/types";

/** Keyframes shared with SceneImageEditor compositor preview */
export const TEMPLATE_FIELD_ANIM_KEYFRAMES_CSS = `
  @keyframes r365-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes r365-slide-up { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
  @keyframes r365-slide-left { from { opacity: 0; transform: translateX(18px);} to { opacity: 1; transform: translateX(0);} }
  @keyframes r365-zoom-in { from { opacity: 0; transform: scale(0.92);} to { opacity: 1; transform: scale(1);} }
  @keyframes r365-pulse { 0% { opacity: .8; } 50% { opacity: 1;} 100% { opacity: .8;} }
`;

/**
 * Inline style for HTML template fields. Preset "none" / missing → empty string.
 */
export function tplAnimInlineStyle(a: TemplateFieldAnimation | undefined): string {
  const preset = a?.preset;
  if (!preset || preset === "none") return "";
  const d = Math.max(0.3, Math.min(2, a.durationSec ?? 0.7));
  const delay = Math.max(0, a.delaySec ?? 0);
  const names: Record<string, string> = {
    "fade-in": "r365-fade-in",
    "slide-up": "r365-slide-up",
    "slide-left": "r365-slide-left",
    "zoom-in": "r365-zoom-in",
    pulse: "r365-pulse",
  };
  const name = names[preset];
  if (!name) return "";
  if (preset === "pulse") {
    return `animation-name:${name};animation-duration:${d}s;animation-delay:${delay}s;animation-iteration-count:infinite;animation-fill-mode:both;`;
  }
  return `animation-name:${name};animation-duration:${d}s;animation-delay:${delay}s;animation-fill-mode:both;opacity:0;`;
}
