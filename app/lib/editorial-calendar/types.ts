import type { PlatformType } from "@/features/editing-studio/types/domain";

export type MatchEventPhase = "pre_match" | "live" | "report_post";

export type EditorialCalendarEventType = "fixture" | "editorial" | "content_deadline" | "campaign";

export type EditorialCalendarSport = "football" | "f1" | "horse_racing" | "other";

export type EditorialCalendarPhaseStatus = "empty" | "planned" | "draft" | "ready" | "published";

export type EditorialCalendarEventStatus = "planned" | "in_progress" | "ready" | "published";

export type EditorialCalendarContentLinks = {
  matchReportProjectIds?: string[];
  languageArticleIds?: string[];
  editingProjectIds?: string[];
};

export type EditorialCalendarDistribution = {
  articleClientIds?: string[];
  socialPlatforms?: PlatformType[];
  scheduledPublishAt?: string;
};

export type EditorialCalendarPhaseSlot = {
  phase: MatchEventPhase;
  label: string;
  status: EditorialCalendarPhaseStatus;
  contentLinks: EditorialCalendarContentLinks;
  distribution?: EditorialCalendarDistribution;
};

export type EditorialCalendarEvent = {
  id: string;
  type: EditorialCalendarEventType;
  sport: EditorialCalendarSport;
  title: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  brands: string[];
  competition?: string;
  group?: string;
  homeTeam?: string;
  awayTeam?: string;
  scheduleSlug?: string;
  fixtureSlug?: string;
  externalIds?: {
    betwayMatchId?: string;
    sixLogicMatchId?: string;
    sixLogicSportId?: string;
  };
  phases?: EditorialCalendarPhaseSlot[];
  contentLinks?: EditorialCalendarContentLinks;
  distribution?: EditorialCalendarDistribution;
  matchPhase?: MatchEventPhase;
  status?: EditorialCalendarEventStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorialCalendarStore = {
  version: 1;
  events: EditorialCalendarEvent[];
};

export type EditorialCalendarListFilters = {
  from?: string;
  to?: string;
  sport?: EditorialCalendarSport | "all";
  brand?: string;
  competition?: string;
  type?: EditorialCalendarEventType | "all";
};

export type EditorialCalendarCreateInput = {
  type: EditorialCalendarEventType;
  sport: EditorialCalendarSport;
  title: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  brands?: string[];
  competition?: string;
  group?: string;
  homeTeam?: string;
  awayTeam?: string;
  notes?: string;
};

export type EditorialCalendarPatchInput = Partial<
  Omit<EditorialCalendarEvent, "id" | "createdAt" | "updatedAt" | "phases">
> & {
  phases?: EditorialCalendarPhaseSlot[];
};
