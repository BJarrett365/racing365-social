import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { computeMatchPhase, defaultFixturePhases } from "@/app/lib/editorial-calendar/phases";
import type {
  EditorialCalendarCreateInput,
  EditorialCalendarEvent,
  EditorialCalendarListFilters,
  EditorialCalendarPatchInput,
  EditorialCalendarStore,
  MatchEventPhase,
} from "@/app/lib/editorial-calendar/types";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";

const BLOB_STORE_NAME = "plexa-editing-studio";
const BLOB_STORE_KEY = "editorial-calendar.json";
const LOCAL_STORE_FILE = "data/local/editorial-calendar.json";

function nowIso(): string {
  return new Date().toISOString();
}

function emptyStore(): EditorialCalendarStore {
  return { version: 1, events: [] };
}

function storePath(): string {
  return path.join(process.cwd(), LOCAL_STORE_FILE);
}

async function readStore(): Promise<EditorialCalendarStore> {
  if (shouldUseNetlifyBlobStore()) {
    return (await readJsonBlob<EditorialCalendarStore>(BLOB_STORE_NAME, BLOB_STORE_KEY)) ?? emptyStore();
  }
  try {
    const raw = await fs.readFile(storePath(), "utf-8");
    const parsed = JSON.parse(raw) as EditorialCalendarStore;
    return parsed?.events ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: EditorialCalendarStore): Promise<void> {
  if (shouldUseNetlifyBlobStore()) {
    await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, store);
    return;
  }
  const full = storePath();
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(store, null, 2), "utf-8");
}

function withMatchPhaseHint(event: EditorialCalendarEvent): EditorialCalendarEvent {
  if (event.type !== "fixture") return event;
  return { ...event, matchPhase: computeMatchPhase(event.startAt) };
}

function inDateRange(event: EditorialCalendarEvent, from?: string, to?: string): boolean {
  const start = new Date(event.startAt).getTime();
  if (Number.isNaN(start)) return true;
  if (from) {
    const fromMs = new Date(from).getTime();
    if (!Number.isNaN(fromMs) && start < fromMs) return false;
  }
  if (to) {
    const toMs = new Date(to).getTime();
    if (!Number.isNaN(toMs) && start > toMs) return false;
  }
  return true;
}

export async function listEditorialCalendarEvents(
  filters: EditorialCalendarListFilters = {},
): Promise<EditorialCalendarEvent[]> {
  const store = await readStore();
  return store.events
    .filter((event) => {
      if (filters.sport && filters.sport !== "all" && event.sport !== filters.sport) return false;
      if (filters.type && filters.type !== "all" && event.type !== filters.type) return false;
      if (filters.brand && filters.brand !== "all" && !event.brands.includes(filters.brand)) return false;
      if (filters.competition && filters.competition !== "all" && event.competition !== filters.competition) {
        return false;
      }
      return inDateRange(event, filters.from, filters.to);
    })
    .map(withMatchPhaseHint)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getEditorialCalendarEvent(id: string): Promise<EditorialCalendarEvent | null> {
  const store = await readStore();
  const event = store.events.find((row) => row.id === id);
  return event ? withMatchPhaseHint(event) : null;
}

export async function createEditorialCalendarEvent(
  input: EditorialCalendarCreateInput,
): Promise<EditorialCalendarEvent> {
  const store = await readStore();
  const ts = nowIso();
  const event: EditorialCalendarEvent = {
    id: newEditingStudioId("cal"),
    type: input.type,
    sport: input.sport,
    title: input.title.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay,
    brands: [...(input.brands ?? [])],
    competition: input.competition,
    group: input.group,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    notes: input.notes,
    status: "planned",
    phases: input.type === "fixture" ? defaultFixturePhases() : undefined,
    createdAt: ts,
    updatedAt: ts,
  };
  store.events.push(event);
  await writeStore(store);
  return withMatchPhaseHint(event);
}

export async function patchEditorialCalendarEvent(
  id: string,
  patch: EditorialCalendarPatchInput,
): Promise<EditorialCalendarEvent | null> {
  const store = await readStore();
  const idx = store.events.findIndex((row) => row.id === id);
  if (idx < 0) return null;
  const prev = store.events[idx]!;
  const next: EditorialCalendarEvent = {
    ...prev,
    ...patch,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: nowIso(),
  };
  store.events[idx] = next;
  await writeStore(store);
  return withMatchPhaseHint(next);
}

export async function deleteEditorialCalendarEvent(id: string): Promise<boolean> {
  const store = await readStore();
  const event = store.events.find((row) => row.id === id);
  if (!event) return false;
  if (event.type === "fixture") return false;
  store.events = store.events.filter((row) => row.id !== id);
  await writeStore(store);
  return true;
}

export async function linkContentToCalendarPhase(input: {
  eventId: string;
  phase: MatchEventPhase;
  editingProjectId?: string;
  matchReportProjectId?: string;
  languageArticleId?: string;
}): Promise<EditorialCalendarEvent | null> {
  const store = await readStore();
  const idx = store.events.findIndex((row) => row.id === input.eventId);
  if (idx < 0) return null;
  const event = store.events[idx]!;
  const phases = event.phases?.length ? [...event.phases] : [];
  let slotIdx = phases.findIndex((row) => row.phase === input.phase);
  if (slotIdx < 0) {
    phases.push({
      phase: input.phase,
      label: input.phase === "pre_match" ? "Pre-match" : input.phase === "live" ? "Live" : "Report / Post",
      status: "draft",
      contentLinks: {},
    });
    slotIdx = phases.length - 1;
  }
  const slot = { ...phases[slotIdx]!, contentLinks: { ...phases[slotIdx]!.contentLinks } };
  if (input.editingProjectId) {
    const ids = new Set(slot.contentLinks.editingProjectIds ?? []);
    ids.add(input.editingProjectId);
    slot.contentLinks.editingProjectIds = [...ids];
  }
  if (input.matchReportProjectId) {
    const ids = new Set(slot.contentLinks.matchReportProjectIds ?? []);
    ids.add(input.matchReportProjectId);
    slot.contentLinks.matchReportProjectIds = [...ids];
  }
  if (input.languageArticleId) {
    const ids = new Set(slot.contentLinks.languageArticleIds ?? []);
    ids.add(input.languageArticleId);
    slot.contentLinks.languageArticleIds = [...ids];
  }
  if (slot.status === "empty") slot.status = "draft";
  phases[slotIdx] = slot;
  const next: EditorialCalendarEvent = {
    ...event,
    phases,
    status: event.status === "planned" ? "in_progress" : event.status,
    updatedAt: nowIso(),
  };
  store.events[idx] = next;
  await writeStore(store);
  return withMatchPhaseHint(next);
}

export async function upsertEditorialCalendarEvents(events: EditorialCalendarEvent[]): Promise<number> {
  const store = await readStore();
  const byId = new Map(store.events.map((row) => [row.id, row]));
  for (const incoming of events) {
    byId.set(incoming.id, incoming);
  }
  store.events = [...byId.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
  await writeStore(store);
  return events.length;
}
