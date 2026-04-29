import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { getRacingDataProvider } from "@/app/features/data/providers";

export default async function FootballLineupsPage() {
  const items = await getRacingDataProvider().getFootballLineups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Football line-ups</h1>
        <p className="mt-2 text-slate-400">
          Three-board Shorts: formation pitch, bench list, injuries &amp; suspensions. Dummy data in{" "}
          <code className="text-slate-500">data/dummy/football-lineups.json</code>.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((b) => (
          <Panel key={b.id} title={`${b.home.name} vs ${b.away.name}`}>
            <p className="text-sm text-slate-500">
              {b.league} · {b.matchDate} {b.kickoff}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {b.home.formation} vs {b.away.formation}
            </p>
            <Link
              href={`/editor/football-lineups/${b.id}`}
              className="mt-4 inline-flex text-sm font-bold text-[#22d3ee] hover:underline"
            >
              Open in editor →
            </Link>
          </Panel>
        ))}
      </div>
    </div>
  );
}
