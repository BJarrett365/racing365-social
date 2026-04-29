import { DATA_FEED_JSON_KIND, DATA_FEED_JSON_SCHEMA_VERSION } from "@/app/lib/data-feed-json";
import { MAX_CSV_HORSES } from "@/app/lib/data-feed-csv";

/**
 * GET empty API-shaped JSON for clients building a feed (query: ?format=racecard|fast-results|next-off).
 * Same shape as Download JSON in the editor Data feed panel.
 */
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") ?? "racecard";

  if (format === "next-off") {
    return Response.json({
      schemaVersion: DATA_FEED_JSON_SCHEMA_VERSION,
      kind: DATA_FEED_JSON_KIND,
      format: "next-off",
      contentId: "",
      headline: "",
      race: {
        id: "",
        course: "",
        raceTime: "",
        title: "",
        distance: "",
        going: "",
        runnersCount: 0,
      },
      tips: [
        { horse: "", odds: "", stars: 0, silks: { silkCode: "", imageUrl: "" } },
        { horse: "", odds: "", stars: 0, silks: { silkCode: "", imageUrl: "" } },
        { horse: "", odds: "", stars: 0, silks: { silkCode: "", imageUrl: "" } },
      ],
      sceneCaptions: {},
      outputs: {
        shortCaption: "",
        voiceoverScript: "",
        versionA: "",
        versionB: "",
        versionC: "",
      },
    });
  }

  if (format === "fast-results") {
    return Response.json({
      schemaVersion: DATA_FEED_JSON_SCHEMA_VERSION,
      kind: DATA_FEED_JSON_KIND,
      format: "fast-results",
      contentId: "",
      headline: "",
      race: {
        id: "",
        course: "",
        raceTime: "",
        title: "",
        distance: "",
        going: "",
        runnersCount: 0,
      },
      result: {
        winner: "",
        sp: "",
        winnerSilks: { silkCode: "", imageUrl: "" },
        placings: Array.from({ length: MAX_CSV_HORSES }, (_, i) => ({
          position: i + 1,
          horse: "",
          sp: "",
          silks: { silkCode: "", imageUrl: "" },
        })),
      },
      sceneCaptions: {},
      outputs: {
        shortCaption: "",
        voiceoverScript: "",
        versionA: "",
        versionB: "",
        versionC: "",
      },
    });
  }

  return Response.json({
    schemaVersion: DATA_FEED_JSON_SCHEMA_VERSION,
    kind: DATA_FEED_JSON_KIND,
    format: "racecard",
    contentId: "",
    headline: "",
    race: {
      id: "",
      course: "",
      raceTime: "",
      title: "",
      distance: "",
      going: "",
      runnersCount: 0,
    },
    runners: Array.from({ length: MAX_CSV_HORSES }, (_, i) => ({
      number: i + 1,
      horse: "",
      odds: "",
      jockey: "",
      trainer: "",
      form: "",
      stars: 0,
      movement: "unknown",
      silks: { silkCode: "", imageUrl: "" },
    })),
    sceneCaptions: {},
    outputs: {
      shortCaption: "",
      voiceoverScript: "",
      versionA: "",
      versionB: "",
      versionC: "",
    },
  });
}
