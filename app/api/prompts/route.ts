import { NextResponse } from "next/server";
import { mergeBuiltinPromptLibraryWithOverrides } from "@/app/lib/builtin-prompt-resolve";
import {
  addUserPrompt,
  deleteUserPrompt,
  readUserPromptsFile,
  updateUserPrompt,
} from "@/app/lib/user-prompts-store";

export async function GET() {
  const builtin = await mergeBuiltinPromptLibraryWithOverrides();
  const { prompts: custom } = await readUserPromptsFile();
  return NextResponse.json({ builtin, custom });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing body." }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const text = typeof o.body === "string" ? o.body : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  try {
    const created = await addUserPrompt(title, text);
    return NextResponse.json({ prompt: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save prompt." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing body." }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const text = typeof o.body === "string" ? o.body : "";
  if (!id || !id.startsWith("up-")) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  try {
    const updated = await updateUserPrompt(id, title, text);
    if (!updated) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ prompt: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update prompt." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id || !id.startsWith("up-")) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const ok = await deleteUserPrompt(id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
