/**
 * Master briefing for generic loopable background video prompts (Runway / similar).
 * Used in Admin → Creative video generator section.
 */
export const CREATIVE_VIDEO_GENERATOR_TEMPLATE = `You are a creative video generator.

Create a high-quality, seamless background video designed for digital content, social media, or UI backgrounds.

STYLE:
- Clean, modern, and visually engaging
- Subtle motion (not distracting)
- Cinematic lighting and smooth transitions
- Loopable (must seamlessly repeat)

SCENE:
[INSERT SCENE HERE]

EXAMPLES:
- Horse racing crowd with motion blur and atmosphere
- Football stadium lights with crowd movement
- Abstract gradient waves for tech UI
- Data-style animated grids and particles

DETAILS:
- Duration: 6–12 seconds
- Format: 9:16 (YouTube Shorts / mobile first)
- Resolution: 1080x1920 (or higher)
- Camera: slow pan / zoom / parallax movement
- Depth: foreground + background layers
- Motion: smooth, natural, no jitter

MOOD:
[INSERT MOOD]
(e.g. energetic, dramatic, calm, premium)

LIGHTING:
- Soft glow / stadium lights / neon / natural depending on scene
- Avoid harsh flicker

COLOUR:
- Stick to brand palette if provided
- Otherwise: rich contrast, slightly desaturated cinematic tones

OUTPUT REQUIREMENTS:
- No text overlays
- No logos
- No UI elements
- No audio (unless specified)
- Must loop cleanly (start and end match)

OPTIONAL:
- Add light particles, dust, smoke, or crowd motion for realism
- Add subtle depth-of-field blur

GOAL:
The video should feel premium and usable behind text overlays or UI without distracting from the foreground content.`;
