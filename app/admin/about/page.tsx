import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `About · Admin · ${BRAND_SUITE}`,
};

export default function AdminAboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Platform</p>
        <h1 className="mt-1 text-3xl font-black text-white">About</h1>
      </div>

      <Panel title="Current MVP status">
        <p className="text-sm text-slate-300">
          MVP runs on dummy JSON with Puppeteer scene renders and FFmpeg assembly. Swap providers for live data,
          OpenAI, and ElevenLabs without rewriting the editor.
        </p>
      </Panel>

      <Panel title="Pipelines and local access">
        <p className="text-sm text-slate-300">
          All Shorts pipelines - horse racing, F1, TEAMtalk, football, and more - live on{" "}
          <Link href="/templates" className="text-[#22c55e] hover:underline">
            /templates
          </Link>
          . Local dev: <strong className="text-slate-200">http://localhost:8081</strong> or{" "}
          <strong className="text-slate-200">http://127.0.0.1:8081</strong>.
        </p>
      </Panel>

      <Link href="/admin" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to Admin →
      </Link>
    </div>
  );
}
