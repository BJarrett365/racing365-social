import { NextResponse } from "next/server";
import { generateGuestInterviewSummary } from "@/app/lib/audio-studio-ai";
import { audioStudioId, ensureAudioProject, updateAudioStudioStore } from "@/app/lib/audio-studio-store";
import { jsonError } from "../../_shared";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      projectId?: string;
      transcript?: string;
      transcriptId?: string;
      audioFileId?: string;
      title?: string;
      sport?: string;
      brand?: string;
    };
    const transcript = String(body.transcript ?? "").trim();
    if (!transcript) return NextResponse.json({ error: "transcript is required" }, { status: 400 });

    const project = await ensureAudioProject(body.projectId);
    const context = [
      "Audio with Guests",
      body.sport ? `Sport: ${body.sport}` : "",
      body.brand ? `Brand: ${body.brand}` : "",
      body.title ? `Title: ${body.title}` : "",
    ].filter(Boolean).join("\n");
    const summary = await generateGuestInterviewSummary(transcript, context);
    const now = new Date().toISOString();
    const note = {
      id: audioStudioId("aud_note"),
      projectId: project.id,
      transcriptId: body.transcriptId,
      audioFileId: body.audioFileId,
      title: summary.title || body.title || "Audio with Guests Summary",
      summary: summary.shortSummary,
      cleanNotes: [summary.cleanArticleBrief].filter(Boolean),
      keyPoints: summary.mainStoryAngles,
      actionPoints: summary.actionPoints,
      quotes: summary.keyQuotes,
      headlines: summary.possibleHeadlines,
      socialPostIdeas: summary.socialPostIdeas,
      content: summaryToText(summary),
      createdAt: now,
      updatedAt: now,
    };

    await updateAudioStudioStore((store) => {
      store.notes.unshift(note);
    });

    return NextResponse.json({ summary, note });
  } catch (error) {
    return jsonError(error, "Audio with Guests summary failed");
  }
}

function summaryToText(summary: Awaited<ReturnType<typeof generateGuestInterviewSummary>>): string {
  return [
    summary.title,
    section("Short Summary", summary.shortSummary),
    section("Key Quotes", summary.keyQuotes),
    section("Main Story Angles", summary.mainStoryAngles),
    section("Possible Headlines", summary.possibleHeadlines),
    section("Action Points", summary.actionPoints),
    section("Follow-up Questions", summary.followUpQuestions),
    section("Clean Article Brief", summary.cleanArticleBrief),
    section("Social Post Ideas", summary.socialPostIdeas),
    section("What Each Guest Said", summary.whatEachGuestSaid),
  ].filter(Boolean).join("\n\n");
}

function section(label: string, value: string | string[]): string {
  if (Array.isArray(value)) return value.length ? `${label}\n${value.map((item) => `- ${item}`).join("\n")}` : "";
  return value ? `${label}\n${value}` : "";
}
