import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import {
  mergeStoredSettingsAsync,
  readStoredSettingsAsync,
  type AdminStoredSettings,
} from "@/app/lib/server-secrets";

type Body = {
  adminToken?: string;
  elevenlabsApiKey?: string;
  openaiApiKey?: string;
  runwaymlApiKey?: string;
  restreamClientId?: string;
  restreamClientSecret?: string;
  muxTokenId?: string;
  muxTokenSecret?: string;
  /** Mux webhook signing secret (Live Control POST /api/webhooks/mux). */
  muxWebhookSigningSecret?: string;
  livepeerApiKey?: string;
  ffmpegPath?: string;
  openaiTtsVoice?: string;
  openaiTtsModel?: string;
  elevenlabsVoiceId?: string;
  elevenlabsModel?: string;
  clearElevenlabsKey?: boolean;
  clearOpenaiKey?: boolean;
  clearRunwaymlKey?: boolean;
  clearFfmpegPath?: boolean;
  clearRestreamKeys?: boolean;
  clearMuxKeys?: boolean;
  clearMuxWebhookSecret?: boolean;
  clearLivepeerKey?: boolean;
};

export async function GET() {
  const s = await readStoredSettingsAsync();
  const mask = (v: string | undefined) => (v && v.length > 0 ? true : false);
  const maskPreview = (v: string | undefined) => {
    const raw = (v ?? "").trim();
    if (!raw) return "";
    const suffix = raw.length > 6 ? raw.slice(-4) : "";
    return `${"•".repeat(Math.max(12, Math.min(40, raw.length)))}${suffix ? ` ${suffix}` : ""}`;
  };
  const restreamOk = Boolean(s.restreamClientId?.trim() && s.restreamClientSecret?.trim());
  const muxOk = Boolean(s.muxTokenId?.trim() && s.muxTokenSecret?.trim());
  const muxWebhookOk = Boolean(s.muxWebhookSigningSecret?.trim());
  return NextResponse.json({
    elevenlabs: { configured: mask(s.elevenlabsApiKey) },
    openai: { configured: mask(s.openaiApiKey) },
    runwayml: { configured: mask(s.runwaymlApiKey) },
    restream: { configured: restreamOk },
    mux: { configured: muxOk },
    muxWebhook: { configured: muxWebhookOk },
    livepeer: { configured: mask(s.livepeerApiKey) },
    elevenlabsApiKeyMasked: maskPreview(s.elevenlabsApiKey),
    openaiApiKeyMasked: maskPreview(s.openaiApiKey),
    runwaymlApiKeyMasked: maskPreview(s.runwaymlApiKey),
    restreamClientIdMasked: maskPreview(s.restreamClientId),
    restreamClientSecretMasked: maskPreview(s.restreamClientSecret),
    muxTokenIdMasked: maskPreview(s.muxTokenId),
    muxTokenSecretMasked: maskPreview(s.muxTokenSecret),
    muxWebhookSigningSecretMasked: maskPreview(s.muxWebhookSigningSecret),
    livepeerApiKeyMasked: maskPreview(s.livepeerApiKey),
    ffmpegPath: s.ffmpegPath?.trim() || "",
    openaiTtsVoice: s.openaiTtsVoice?.trim() || "",
    openaiTtsModel: s.openaiTtsModel?.trim() || "",
    elevenlabsVoiceId: s.elevenlabsVoiceId?.trim() || "",
    elevenlabsModel: s.elevenlabsModel?.trim() || "",
    updatedAt: s.updatedAt || null,
    adminTokenRequired: Boolean(process.env.ADMIN_TOKEN?.trim()),
  });
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

  const clearKeys: (keyof AdminStoredSettings)[] = [];
  if (body.clearElevenlabsKey) clearKeys.push("elevenlabsApiKey");
  if (body.clearOpenaiKey) clearKeys.push("openaiApiKey");
  if (body.clearRunwaymlKey) clearKeys.push("runwaymlApiKey");
  if (body.clearFfmpegPath) clearKeys.push("ffmpegPath");
  if (body.clearRestreamKeys) {
    clearKeys.push("restreamClientId", "restreamClientSecret");
  }
  if (body.clearMuxKeys) {
    clearKeys.push("muxTokenId", "muxTokenSecret");
  }
  if (body.clearMuxWebhookSecret) {
    clearKeys.push("muxWebhookSigningSecret");
  }
  if (body.clearLivepeerKey) clearKeys.push("livepeerApiKey");

  const partial: Partial<AdminStoredSettings> = {};
  if (body.elevenlabsApiKey?.trim()) partial.elevenlabsApiKey = body.elevenlabsApiKey.trim();
  if (body.openaiApiKey?.trim()) partial.openaiApiKey = body.openaiApiKey.trim();
  if (body.runwaymlApiKey?.trim()) partial.runwaymlApiKey = body.runwaymlApiKey.trim();
  if (body.restreamClientId?.trim()) partial.restreamClientId = body.restreamClientId.trim();
  if (body.restreamClientSecret?.trim()) partial.restreamClientSecret = body.restreamClientSecret.trim();
  if (body.muxTokenId?.trim()) partial.muxTokenId = body.muxTokenId.trim();
  if (body.muxTokenSecret?.trim()) partial.muxTokenSecret = body.muxTokenSecret.trim();
  if (body.muxWebhookSigningSecret?.trim()) partial.muxWebhookSigningSecret = body.muxWebhookSigningSecret.trim();
  if (body.livepeerApiKey?.trim()) partial.livepeerApiKey = body.livepeerApiKey.trim();
  if (body.ffmpegPath?.trim()) partial.ffmpegPath = body.ffmpegPath.trim();
  if (body.openaiTtsVoice?.trim()) partial.openaiTtsVoice = body.openaiTtsVoice.trim();
  if (body.openaiTtsModel?.trim()) partial.openaiTtsModel = body.openaiTtsModel.trim();
  if (body.elevenlabsVoiceId?.trim()) partial.elevenlabsVoiceId = body.elevenlabsVoiceId.trim();
  if (body.elevenlabsModel?.trim()) partial.elevenlabsModel = body.elevenlabsModel.trim();

  await mergeStoredSettingsAsync(partial, clearKeys);

  const { resetFfmpegBinaryCache } = await import("@/app/features/video/ffmpeg-utils");
  const { resetAudioProvider } = await import("@/app/features/audio");
  resetFfmpegBinaryCache();
  resetAudioProvider();

  return NextResponse.json({ ok: true });
}
