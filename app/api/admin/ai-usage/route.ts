import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getServerSecretAsync } from "@/app/lib/server-secrets";

type ProviderState = "ready" | "missing_key" | "permission_required" | "provider_error" | "unsupported";

type ProviderUsage = {
  provider: "openai" | "elevenlabs" | "claude" | "deepseek";
  label: string;
  state: ProviderState;
  summary: string;
  dashboardUrl: string;
  metrics?: Array<{ label: string; value: string }>;
  error?: string;
};

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function unixDaysAgo(days: number): number {
  return Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
}

function valueAt(obj: Record<string, unknown>, key: string): number | undefined {
  const raw = obj[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function usageErrorState(status: number): ProviderState {
  return status === 401 || status === 403 ? "permission_required" : "provider_error";
}

async function fetchJson(url: string, headers: HeadersInit): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, { headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function openAiUsage(days: number): Promise<ProviderUsage> {
  const key = await getServerSecretAsync("OPENAI_API_KEY");
  const dashboardUrl = "https://platform.openai.com/usage";
  if (!key) {
    return {
      provider: "openai",
      label: "OpenAI",
      state: "missing_key",
      summary: "No OpenAI key is configured.",
      dashboardUrl,
    };
  }

  const start = unixDaysAgo(days);
  const headers = { Authorization: `Bearer ${key}` };
  const [costs, completions] = await Promise.all([
    fetchJson(`https://api.openai.com/v1/organization/costs?start_time=${start}&bucket_width=1d&limit=${days}`, headers),
    fetchJson(`https://api.openai.com/v1/organization/usage/completions?start_time=${start}&bucket_width=1d&limit=${days}`, headers),
  ]);

  if (!costs.ok && !completions.ok) {
    return {
      provider: "openai",
      label: "OpenAI",
      state: usageErrorState(costs.status || completions.status),
      summary: "OpenAI key is valid for generation, but usage/cost reporting needs organization usage permissions.",
      dashboardUrl,
      error: readProviderError(costs.data) || readProviderError(completions.data),
    };
  }

  let costTotal = 0;
  let currency = "USD";
  if (costs.ok && typeof costs.data === "object" && costs.data) {
    for (const bucket of ((costs.data as { data?: unknown[] }).data ?? [])) {
      if (!bucket || typeof bucket !== "object") continue;
      for (const result of ((bucket as { results?: unknown[] }).results ?? [])) {
        if (!result || typeof result !== "object") continue;
        const amount = (result as { amount?: { value?: number; currency?: string } }).amount;
        if (typeof amount?.value === "number") costTotal += amount.value;
        if (amount?.currency) currency = amount.currency.toUpperCase();
      }
    }
  }

  let inputTokens = 0;
  let outputTokens = 0;
  let requests = 0;
  if (completions.ok && typeof completions.data === "object" && completions.data) {
    for (const bucket of ((completions.data as { data?: unknown[] }).data ?? [])) {
      if (!bucket || typeof bucket !== "object") continue;
      for (const result of ((bucket as { results?: unknown[] }).results ?? [])) {
        if (!result || typeof result !== "object") continue;
        const r = result as Record<string, unknown>;
        inputTokens += valueAt(r, "input_tokens") ?? 0;
        outputTokens += valueAt(r, "output_tokens") ?? 0;
        requests += valueAt(r, "num_model_requests") ?? valueAt(r, "num_requests") ?? 0;
      }
    }
  }

  return {
    provider: "openai",
    label: "OpenAI",
    state: "ready",
    summary: `Usage API reachable for the last ${days} days.`,
    dashboardUrl,
    metrics: [
      { label: "Estimated cost", value: costs.ok ? formatCurrency(costTotal, currency) : "Permission needed" },
      { label: "Input tokens", value: completions.ok ? formatNumber(inputTokens) : "Permission needed" },
      { label: "Output tokens", value: completions.ok ? formatNumber(outputTokens) : "Permission needed" },
      { label: "Requests", value: completions.ok ? formatNumber(requests) : "Permission needed" },
    ],
  };
}

async function elevenLabsUsage(days: number): Promise<ProviderUsage> {
  const key = await getServerSecretAsync("ELEVENLABS_API_KEY");
  const dashboardUrl = "https://elevenlabs.io/app/usage";
  if (!key) {
    return {
      provider: "elevenlabs",
      label: "ElevenLabs",
      state: "missing_key",
      summary: "No ElevenLabs key is configured.",
      dashboardUrl,
    };
  }

  const headers = { "xi-api-key": key };
  const start = unixDaysAgo(days);
  const end = Math.floor(Date.now() / 1000);
  const [subscription, usage] = await Promise.all([
    fetchJson("https://api.elevenlabs.io/v1/user/subscription", headers),
    fetchJson(`https://api.elevenlabs.io/v1/usage/character-stats?start_unix=${start}&end_unix=${end}`, headers),
  ]);

  if (!subscription.ok) {
    return {
      provider: "elevenlabs",
      label: "ElevenLabs",
      state: usageErrorState(subscription.status),
      summary: "ElevenLabs usage could not be read.",
      dashboardUrl,
      error: readProviderError(subscription.data),
    };
  }

  const sub = typeof subscription.data === "object" && subscription.data
    ? subscription.data as Record<string, unknown>
    : {};
  const characterCount = valueAt(sub, "character_count") ?? valueAt(sub, "characters_used");
  const characterLimit = valueAt(sub, "character_limit") ?? valueAt(sub, "characters_limit");
  const nextCharacterCount = valueAt(sub, "next_character_count");
  const tier = typeof sub.tier === "string" ? sub.tier : undefined;
  const status = typeof sub.status === "string" ? sub.status : undefined;
  let periodCharacters = 0;
  if (usage.ok && typeof usage.data === "object" && usage.data) {
    const usageObject = (usage.data as { usage?: Record<string, unknown> }).usage;
    if (usageObject) {
      for (const values of Object.values(usageObject)) {
        if (Array.isArray(values)) {
          periodCharacters += values.reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
        }
      }
    }
  }

  return {
    provider: "elevenlabs",
    label: "ElevenLabs",
    state: "ready",
    summary: `Subscription API reachable${tier ? ` (${tier})` : ""}${status ? `, status ${status}` : ""}.`,
    dashboardUrl,
    metrics: [
      { label: "Characters used", value: characterCount === undefined ? "Unknown" : formatNumber(characterCount) },
      { label: "Character limit", value: characterLimit === undefined ? "Unknown" : formatNumber(characterLimit) },
      { label: "Remaining", value: characterCount === undefined || characterLimit === undefined ? "Unknown" : formatNumber(Math.max(0, characterLimit - characterCount)) },
      { label: `${days}d usage`, value: usage.ok ? formatNumber(periodCharacters) : "Usage permission needed" },
      ...(nextCharacterCount === undefined ? [] : [{ label: "Next period count", value: formatNumber(nextCharacterCount) }]),
    ],
  };
}

function readProviderError(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const error = (data as { error?: { message?: string } }).error;
  if (typeof error?.message === "string") return error.message;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: string }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export async function GET(request: Request) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, Math.round(daysParam))) : 30;
  const [openai, elevenlabs] = await Promise.all([openAiUsage(days), elevenLabsUsage(days)]);

  return NextResponse.json({
    ok: true,
    days,
    generatedAt: new Date().toISOString(),
    providers: [
      openai,
      elevenlabs,
      {
        provider: "claude",
        label: "Claude",
        state: "unsupported",
        summary: "Planned connector. Anthropic usage reporting requires a separate Claude Admin API key.",
        dashboardUrl: "https://console.anthropic.com/settings/usage",
        metrics: [{ label: "Requirement", value: "ANTHROPIC_ADMIN_API_KEY" }],
      },
      {
        provider: "deepseek",
        label: "DeepSeek",
        state: "unsupported",
        summary: "Planned connector. DeepSeek usage is best handled via dashboard/export or app-side request logging.",
        dashboardUrl: "https://platform.deepseek.com/usage",
        metrics: [{ label: "API status", value: "Dashboard/manual export first" }],
      },
    ] satisfies ProviderUsage[],
  });
}
