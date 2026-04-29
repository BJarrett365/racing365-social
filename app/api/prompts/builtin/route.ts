import { NextResponse } from "next/server";
import { getBuiltinPromptLibrary } from "@/app/lib/prompts-catalog";
import {
  deleteBuiltinPromptOverride,
  setBuiltinPromptOverride,
} from "@/app/lib/builtin-prompt-overrides-store";

function isValidBuiltinId(id: string): boolean {
  if (!id.startsWith("builtin-")) return false;
  return getBuiltinPromptLibrary().some((r) => r.id === id);
}

export async function PUT(request: Request) {
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
  const text = typeof o.body === "string" ? o.body : "";
  if (!isValidBuiltinId(id)) {
    return NextResponse.json({ error: "Unknown or invalid built-in prompt id." }, { status: 400 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "Prompt body cannot be empty." }, { status: 400 });
  }
  try {
    const entry = await setBuiltinPromptOverride(id, text);
    return NextResponse.json({ ok: true, id, updatedAt: entry.updatedAt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save built-in override." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!isValidBuiltinId(id)) {
    return NextResponse.json({ error: "Unknown or invalid built-in prompt id." }, { status: 400 });
  }
  try {
    const ok = await deleteBuiltinPromptOverride(id);
    if (!ok) return NextResponse.json({ error: "No override to remove." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not remove override." }, { status: 500 });
  }
}
