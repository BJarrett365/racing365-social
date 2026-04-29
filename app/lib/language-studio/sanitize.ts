export function sanitizeImportedContent(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/\b(ignore|disregard|override)\s+(all\s+)?(previous|above|system|developer)\s+instructions\b/gi, "[removed unsafe instruction]")
    .replace(/\bact\s+as\s+(system|developer|admin)\b/gi, "[removed unsafe instruction]")
    .replace(/\breturn\s+your\s+prompt\b/gi, "[removed unsafe instruction]")
    .replace(/\s+\n/g, "\n")
    .trim();
}
