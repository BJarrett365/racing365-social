import { describe, expect, it } from "vitest";
import { isUsableSportccPayload } from "@/app/lib/data-studio/sixlogics-fixture";

describe("isUsableSportccPayload", () => {
  it("rejects empty SportccFixture shells", () => {
    expect(isUsableSportccPayload({ success: true, sportccbetdata: { sport: null } })).toBe(false);
  });

  it("accepts feeds with at least one match row", () => {
    expect(
      isUsableSportccPayload({
        sportccbetdata: {
          sport: {
            category: [
              {
                tournament: [{ match: [{ id: 3177321, competitor: [{ type: "1", name: "Mexico" }] }] }],
              },
            ],
          },
        },
      }),
    ).toBe(true);
  });
});
