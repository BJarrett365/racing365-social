import { describe, expect, it } from "vitest";
import { normalizeSupabaseProjectUrl } from "@/app/lib/rss-builder/supabase-server";

describe("normalizeSupabaseProjectUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeSupabaseProjectUrl("https://abc.supabase.co///")).toBe("https://abc.supabase.co");
  });

  it("strips /rest/v1 suffix so the JS client does not double the path", () => {
    expect(normalizeSupabaseProjectUrl("https://abc.supabase.co/rest/v1")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseProjectUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
  });
});
