/**
 * Example: generate one image from a preset + print the succeeded task JSON.
 *
 * Setup:
 *   cd tools/runway-image-gen
 *   npm install
 *   cp env.example .env   # add RUNWAYML_API_SECRET
 *
 * Run:
 *   npm run example
 */

import "dotenv/config";

import { generateImage } from "../src/generate-image.js";
import { PROMPT_PRESETS } from "../src/presets.js";
import { log } from "../src/logger.js";

async function main() {
  const input = {
    ...PROMPT_PRESETS.racing365_shorts_backdrop,
    // Optional overrides:
    // seed: 3581887305,
    // referenceImages: [{ uri: "https://example.com/ref.png" }],
    // rawPrompt: true,
    // promptText: "Standalone prompt without brand template…",
  };

  log.info("Example run — Racing365 shorts backdrop preset");

  const result = await generateImage(input);

  console.log("\n--- Final prompt sent to Runway ---\n");
  console.log(result.finalPrompt);
  console.log("\n--- Succeeded task (output URLs expire in 24–48h; download & store) ---\n");
  console.log(JSON.stringify(result.task, null, 2));
  console.log("\n--- Meta ---\n");
  console.log(JSON.stringify(result.meta, null, 2));
}

main().catch((err) => {
  log.error("Example failed", err);
  process.exitCode = 1;
});
