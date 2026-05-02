import { NextResponse } from "next/server";
import { generateAudioNotes } from "@/app/lib/audio-studio-ai";
import {
  audioStudioId,
  ensureAudioProject,
  readAudioStudioStore,
  updateAudioStudioStore,
  type AudioNote,
} from "@/app/lib/audio-studio-store";
import { jsonError } from "../_shared";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId")?.trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const store = await readAudioStudioStore();
    const notes = store.notes
      .filter((note) => note.projectId === projectId)
      .map((note) => ({ ...note, content: note.content || noteToText(note) }))
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

    return NextResponse.json({ notes });
  } catch (error) {
    return jsonError(error, "Audio notes lookup failed");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      transcript?: string;
      transcriptId?: string;
      audioFileId?: string;
      context?: string;
      title?: string;
      content?: string;
      saveOnly?: boolean;
    };
    const transcript = String(body.transcript ?? body.content ?? "").trim();
    if (!transcript) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }

    const project = await ensureAudioProject(body.projectId);
    const now = new Date().toISOString();
    const generated = body.saveOnly
      ? {
          title: String(body.title || "Saved Audio Notes").trim(),
          summary: transcript.slice(0, 500),
          cleanNotes: [],
          keyPoints: [],
          actionPoints: [],
          quotes: [],
          headlines: [],
          socialPostIdeas: [],
        }
      : await generateAudioNotes(transcript, body.context);
    const note = {
      id: audioStudioId("aud_note"),
      projectId: project.id,
      transcriptId: body.transcriptId,
      audioFileId: body.audioFileId,
      ...generated,
      content: body.content || noteToText(generated),
      createdAt: now,
      updatedAt: now,
    };

    await updateAudioStudioStore((store) => {
      store.notes.unshift(note);
    });

    return NextResponse.json({ note });
  } catch (error) {
    return jsonError(error, "Audio notes failed");
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as { id?: string; title?: string; content?: string };
    const id = body.id?.trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    let note: AudioNote | undefined;
    await updateAudioStudioStore((store) => {
      note = store.notes.find((item) => item.id === id);
      if (!note) return;
      note.title = String(body.title || note.title || "Saved Audio Notes").trim();
      note.content = String(body.content ?? note.content ?? noteToText(note));
      note.summary = note.content.slice(0, 500);
      note.updatedAt = new Date().toISOString();
    });

    if (!note) return NextResponse.json({ error: "note not found" }, { status: 404 });
    return NextResponse.json({ note: { ...note, content: note.content || noteToText(note) } });
  } catch (error) {
    return jsonError(error, "Audio note update failed", 400);
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json() as { id?: string };
    const id = body.id?.trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    let deleted = false;
    await updateAudioStudioStore((store) => {
      const before = store.notes.length;
      store.notes = store.notes.filter((note) => note.id !== id);
      deleted = store.notes.length !== before;
    });

    if (!deleted) return NextResponse.json({ error: "note not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    return jsonError(error, "Audio note delete failed", 400);
  }
}

function noteToText(note: Pick<AudioNote, "title" | "summary" | "cleanNotes" | "keyPoints" | "actionPoints" | "quotes" | "headlines" | "socialPostIdeas">): string {
  const sections = [
    ["Summary", note.summary],
    ["Clean Notes", note.cleanNotes],
    ["Key Points", note.keyPoints],
    ["Action Points", note.actionPoints],
    ["Quotes", note.quotes],
    ["Headlines", note.headlines],
    ["Social Post Ideas", note.socialPostIdeas],
  ];
  return [
    note.title,
    ...sections.map(([label, value]) => {
      if (Array.isArray(value)) return value.length ? `${label}\n${value.map((item) => `- ${item}`).join("\n")}` : "";
      return value ? `${label}\n${value}` : "";
    }),
  ].filter(Boolean).join("\n\n");
}
