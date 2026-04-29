import { readBuiltinPromptOverridesFile } from "@/app/lib/builtin-prompt-overrides-store";
import { getBuiltinPromptLibrary, type BuiltinPromptRow } from "@/app/lib/prompts-catalog";

export type BuiltinPromptRowWithCatalog = BuiltinPromptRow & {
  catalogBody: string;
  overriddenAt?: string;
};

export async function mergeBuiltinPromptLibraryWithOverrides(): Promise<BuiltinPromptRowWithCatalog[]> {
  const base = getBuiltinPromptLibrary();
  const { overrides } = await readBuiltinPromptOverridesFile();
  return base.map((row) => {
    const o = overrides[row.id];
    return {
      ...row,
      catalogBody: row.body,
      body: o?.body ?? row.body,
      overriddenAt: o?.updatedAt,
    };
  });
}

/** Effective body for a built-in id (override or catalog). */
export async function resolveBuiltinPromptBody(id: string): Promise<string> {
  const base = getBuiltinPromptLibrary().find((r) => r.id === id);
  if (!base) return "";
  const { overrides } = await readBuiltinPromptOverridesFile();
  return overrides[id]?.body ?? base.body;
}
