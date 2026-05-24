import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseAuthorPageHtml } from "@/app/lib/language-studio/parse-author-page";

describe("parse-author-page", () => {
  it("extracts F365 author metadata from HTML fixture", () => {
    const html = fs.readFileSync(
      path.join(process.cwd(), "app/lib/language-studio/__fixtures__/f365-author-lewis-oldham.html"),
      "utf-8",
    );
    const parsed = parseAuthorPageHtml(html, "https://football365.com/author/lewis-oldham");
    expect(parsed.authorPageUrl).toContain("/author/lewis-oldham");
    expect(parsed.avatarUrl).toContain("lewis-oldham.jpg");
  });
});
