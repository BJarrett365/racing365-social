import { z } from "zod";
import { platformTypeSchema } from "@/features/editing-studio/validators/editing-studio-schemas";

export const matchEventPhaseSchema = z.enum(["pre_match", "live", "report_post"]);

export const editorialCalendarEventTypeSchema = z.enum([
  "fixture",
  "editorial",
  "content_deadline",
  "campaign",
]);

export const editorialCalendarSportSchema = z.enum(["football", "f1", "horse_racing", "other"]);

export const editorialCalendarPhaseStatusSchema = z.enum([
  "empty",
  "planned",
  "draft",
  "ready",
  "published",
]);

export const editorialCalendarContentLinksSchema = z.object({
  matchReportProjectIds: z.array(z.string()).optional(),
  languageArticleIds: z.array(z.string()).optional(),
  editingProjectIds: z.array(z.string()).optional(),
});

export const editorialCalendarDistributionSchema = z.object({
  articleClientIds: z.array(z.string()).optional(),
  socialPlatforms: z.array(platformTypeSchema).optional(),
  scheduledPublishAt: z.string().optional(),
});

export const editorialCalendarPhaseSlotSchema = z.object({
  phase: matchEventPhaseSchema,
  label: z.string().min(1),
  status: editorialCalendarPhaseStatusSchema,
  contentLinks: editorialCalendarContentLinksSchema,
  distribution: editorialCalendarDistributionSchema.optional(),
});

export const editorialCalendarCreateSchema = z.object({
  type: editorialCalendarEventTypeSchema,
  sport: editorialCalendarSportSchema,
  title: z.string().min(1).max(300),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  brands: z.array(z.string()).optional(),
  competition: z.string().optional(),
  group: z.string().optional(),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export const editorialCalendarPatchSchema = editorialCalendarCreateSchema.partial().extend({
  status: z.enum(["planned", "in_progress", "ready", "published"]).optional(),
  phases: z.array(editorialCalendarPhaseSlotSchema).optional(),
  externalIds: z
    .object({
      betwayMatchId: z.string().optional(),
      sixLogicMatchId: z.string().optional(),
      sixLogicSportId: z.string().optional(),
    })
    .optional(),
});
