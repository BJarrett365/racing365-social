/**
 * Consolidates journalist profiles via store read/write path (identity dedupe + article author canonicalisation).
 * Invoked by scripts/repair-journalist-profile-duplicates.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";

async function main(): Promise<void> {
  const file = path.join(process.cwd(), "data", "local", "language-studio.json");
  let journalistProfilesBefore = 0;
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf-8")) as { journalistProfiles?: Record<string, unknown> };
    journalistProfilesBefore = Object.keys(raw.journalistProfiles ?? {}).length;
  } catch {
    console.log("repair-journalist-profile-duplicates: no local language-studio.json; nothing to repair.");
    return;
  }

  const data = await readLanguageStudioData();
  const journalistProfilesAfter = Object.keys(data.journalistProfiles).length;
  await writeLanguageStudioData(data);

  console.log(
    JSON.stringify({
      journalistProfilesBefore,
      journalistProfilesAfter,
      duplicateProfilesMergedAway: Math.max(0, journalistProfilesBefore - journalistProfilesAfter),
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
