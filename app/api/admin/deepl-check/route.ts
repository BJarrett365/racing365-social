import { Translator } from "deepl-node";
import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync, readStoredSettingsAsync } from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  deeplApiKey?: string;
  deeplApiUrl?: string;
};

function resolveDeepLServerUrl(settingsUrl?: string, bodyUrl?: string): string | undefined {
  const fromBody = bodyUrl?.trim();
  if (fromBody) return fromBody;
  const fromEnv = process.env.DEEPL_API_URL?.trim();
  if (fromEnv) return fromEnv;
  const fromSettings = settingsUrl?.trim();
  return fromSettings || undefined;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const denied = assertAdminWrite(request, body.adminToken);
  if (denied) return denied;

  const settings = await readStoredSettingsAsync();
  const key = body.deeplApiKey?.trim() || (await getServerSecretAsync("DEEPL_API_KEY"));
  const serverUrl = resolveDeepLServerUrl(settings.deeplApiUrl, body.deeplApiUrl);

  if (!key) {
    return NextResponse.json(
      { error: "No DeepL API key provided (set DEEPL_API_KEY or store a key in admin settings)." },
      { status: 400 },
    );
  }

  try {
    const translator = new Translator(key, serverUrl ? { serverUrl } : undefined);
    const usage = await translator.getUsage();
    return NextResponse.json({
      ok: true,
      serverUrl: serverUrl ?? "https://api.deepl.com (default)",
      characterCount: usage.character?.count ?? null,
      characterLimit: usage.character?.limit ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "DeepL request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
