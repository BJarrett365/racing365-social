export type MatchReportPushAction = "calendar" | "publish" | "rewrite" | "language" | "all";

export type MatchReportPushActionResults = {
  calendar?: { eventId: string; url: string };
  rewrite?: { articleId: string; rewriteUrl: string };
  language?: { articleId: string; languageUrl: string };
  publish?: { articleId: string; reviewUrl: string; rewriteUrl: string };
  warnings?: string[];
};
