import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { AudioStudioWorkspace } from "./AudioStudioWorkspace";
import { audioStudioTools, visibleAudioStudioTools } from "./audio-studio-config";

const destinations = [
  "Video Studio",
  "Podcast Template",
  "Social Post Creator",
  "Language Studio",
  "Media Library",
];

type AudioStudioPageProps = {
  searchParams?: Promise<{ tool?: string | string[] }>;
};

export default async function AudioStudioPage({ searchParams }: AudioStudioPageProps) {
  const params = await searchParams;
  const toolParam = Array.isArray(params?.tool) ? params?.tool[0] : params?.tool;
  const activeTool = audioStudioTools.find((tool) => tool.id === toolParam);

  if (activeTool) {
    return <AudioStudioWorkspace activeTool={activeTool} />;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#24301f] bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.16),transparent_30%),#070b12] px-6 py-10 shadow-2xl md:px-10">
        <div className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Audio Studio</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            Record, transcribe, translate and create voice assets.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Audio Studio is a separate Planet Sport Studio module for notes, speech to text, text to speech, ElevenLabs voice tools,
            guest audio, language audio and reusable voice profiles without changing existing video, image, template or
            publishing flows.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleAudioStudioTools.map((tool) => (
          <Panel key={tool.id} title={tool.providers.join(" + ")}>
            <div className="flex h-full flex-col gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-[#eab308]">{tool.eyebrow}</p>
                <h2 className="mt-2 text-xl font-bold text-[color:var(--text-primary)]">{tool.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{tool.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tool.outputs.map((output) => (
                    <span key={output} className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                      {output}
                    </span>
                  ))}
                </div>
              </div>
              <Link href={tool.href}>
                <R365Button>Open {tool.title}</R365Button>
              </Link>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Send Outputs Into Planet Sport Studio">
        <div className="grid gap-3 md:grid-cols-5">
          {destinations.map((destination) => (
            <div key={destination} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
              <p className="text-sm font-bold text-[color:var(--text-primary)]">{destination}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                Use generated transcripts, notes, scripts, clips and audio files in this workflow.
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
