"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import type { MatchCopyMode, SportVerticalId } from "@/app/lib/data-studio/types";
import { LEARNING_LIBRARY_ENTRIES, learningKindLabel } from "@/app/lib/data-studio/learning-library";
import { FixtureFetchPanel } from "@/app/data-studio/FixtureFetchPanel";
import { SPORT_VERTICALS } from "@/app/lib/data-studio/sport-verticals";
import { FOOTBALL_FIXTURE_WIDGET_CATALOG } from "@/app/lib/data-studio/fixture-widget-catalog";

function entryMatchesVertical(entryVerticals: SportVerticalId[], selected: SportVerticalId): boolean {
  if (selected === "multi") return true;
  return entryVerticals.includes(selected) || entryVerticals.includes("multi");
}

export function DataStudioClient() {
  const [vertical, setVertical] = useState<SportVerticalId>("football");
  const [workflow, setWorkflow] = useState<MatchCopyMode>("preview");

  const activeVertical = useMemo(
    () => SPORT_VERTICALS.find((v) => v.id === vertical) ?? SPORT_VERTICALS[0],
    [vertical],
  );

  const filteredLearning = useMemo(
    () => LEARNING_LIBRARY_ENTRIES.filter((e) => entryMatchesVertical(e.verticals, vertical)),
    [vertical],
  );

  return (
    <div className="space-y-8">
      <Panel title="Sport vertical">
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
          Pick the vertical you are importing or reporting on. Each vertical will get its own feeds and prompts; this hub
          stays one place for discovery.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SPORT_VERTICALS.map((v) => {
            const on = v.id === vertical;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVertical(v.id)}
                className={
                  on
                    ? "rounded-full border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-100"
                    : "rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] transition hover:border-[#22c55e]/40"
                }
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </Panel>

      <FixtureFetchPanel dataStudioVertical={vertical} />

      <Panel title="Preview, report or 16 conclusions">
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
          Use the same fixture feed where possible:{" "}
          <strong className="text-[color:var(--text-primary)]">previews</strong> ahead of the event (Planet Sport brands
          across football, rugby, cricket, tennis, F1…),{" "}
          <strong className="text-[color:var(--text-primary)]">reports</strong> after full time — reusing stable preview context
          where still true — and{" "}
          <strong className="text-[color:var(--text-primary)]">16 conclusions</strong> for Football365-style numbered
          post-match analysis (generate from the fixture panel; optional tone cues).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWorkflow("preview")}
            className={
              workflow === "preview"
                ? "rounded-full border border-sky-500/50 bg-sky-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-sky-900 dark:text-sky-100"
                : "rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] transition hover:border-sky-500/40"
            }
          >
            Match preview
          </button>
          <button
            type="button"
            onClick={() => setWorkflow("report")}
            className={
              workflow === "report"
                ? "rounded-full border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100"
                : "rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] transition hover:border-amber-500/40"
            }
          >
            Match report
          </button>
          <button
            type="button"
            onClick={() => setWorkflow("sixteen_conclusions")}
            className={
              workflow === "sixteen_conclusions"
                ? "rounded-full border border-violet-500/50 bg-violet-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-900 dark:text-violet-100"
                : "rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)] transition hover:border-violet-500/40"
            }
          >
            16 conclusions
          </button>
          <Link href="/prompts" className="inline-flex items-center">
            <R365Button variant="ghost">Open Prompts library</R365Button>
          </Link>
        </div>

        {workflow === "preview" && vertical === "football" ? (
          <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            <p className="font-bold text-[color:var(--text-primary)]">Use Match Report Builder for football previews</p>
            <p className="mt-2">
              The builder now supports <strong className="text-[color:var(--text-primary)]">match previews</strong> with
              the Preview Intelligence Object (PIO) — structured form, H2H, team news, and fact-checking instead of raw
              fixture JSON. This Data Studio path remains for legacy workflows during migration.
            </p>
            <div className="mt-3">
              <Link
                href="/match-report-builder?content_type=match_preview"
                className="inline-flex rounded-full border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-sky-200 hover:bg-sky-500/20"
              >
                Open Match Report Builder (preview)
              </Link>
            </div>
          </div>
        ) : null}

        {workflow === "preview" ? (
          <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            {vertical === "horse_racing" ? (
              <>
                <p className="font-bold text-[color:var(--text-primary)]">Racing365-style spine (horse racing)</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-[color:var(--text-secondary)]">
                  <li>Meeting context — course, going, feature races (from feed only)</li>
                  <li>Race time · distance/trip · conditions</li>
                  <li>Broadcast / streaming when supplied</li>
                  <li>Field — declarations, notable absentees or NR updates when supplied</li>
                  <li>Odds / markets — verbatim from feed; gamble responsibly when brand requires</li>
                  <li>Tip or verdict — opinion-led but grounded in supplied facts (trainer/jockey form when in JSON)</li>
                </ul>
                <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                  Brand reference:{" "}
                  <a
                    href="https://www.racing365.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#22c55e] hover:underline"
                  >
                    Racing365
                  </a>
                  . Structure guide:{" "}
                  <a
                    href="https://www.bbc.co.uk/sport/horse-racing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#22c55e] hover:underline"
                  >
                    BBC Sport — Horse Racing
                  </a>{" "}
                  (learning only). Builtin prompt:{" "}
                  <strong className="text-[color:var(--text-secondary)]">Match preview (Planet Sport)</strong> on the Prompts page.
                </p>
              </>
            ) : vertical === "football" ? (
              <>
                <p className="font-bold text-[color:var(--text-primary)]">Football365-style spine (football)</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-[color:var(--text-secondary)]">
                  <li>Intro: stakes and league/table story</li>
                  <li>Kick-off time · venue · competition</li>
                  <li>How to watch / broadcast (when known)</li>
                  <li>Team news — both sides</li>
                  <li>Odds / markets (from feed only)</li>
                  <li>Sidebar / embedded widgets when data exists: win probability, season stats comparison, recent meetings, player-vs-player</li>
                </ul>
                <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                  Live reference:{" "}
                  <a
                    href="https://www.football365.com/match-preview/arsenal-v-burnley-prediction-preview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#22c55e] hover:underline"
                  >
                    Football365 match preview example
                  </a>
                  . Builtin prompt: <strong className="text-[color:var(--text-secondary)]">Match preview (Planet Sport)</strong>{" "}
                  on the Prompts page.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-[color:var(--text-primary)]">Preview spine ({activeVertical.label})</p>
                <p className="mt-1 text-[color:var(--text-secondary)]">{activeVertical.shortDescription}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-[color:var(--text-secondary)]">
                  <li>Context and stakes drawn only from the feed (competition, table, draw position, grid…)</li>
                  <li>Schedule — kick-off, sessions, toss or tee times when supplied</li>
                  <li>Coverage note when broadcast data exists</li>
                  <li>Squad / lineup / declarations — never guessed beyond JSON</li>
                  <li>Odds or markets — integrate only when the payload includes prices</li>
                </ul>
                <p className="mt-3 text-xs text-[color:var(--text-muted)]">
                  Select <strong className="text-[color:var(--text-secondary)]">Football</strong> or{" "}
                  <strong className="text-[color:var(--text-secondary)]">Horse Racing</strong> above for a concrete partner-style
                  example. Builtin prompt:{" "}
                  <strong className="text-[color:var(--text-secondary)]">Match preview (Planet Sport)</strong> on the Prompts page.
                </p>
              </>
            )}
            <p className="mt-3 font-bold text-[color:var(--text-primary)]">Other Planet Sport verticals</p>
            <p className="mt-1 text-[color:var(--text-secondary)]">
              Same template swaps headings (sessions/grid for F1, toss/pitch for cricket, H2H/surface for tennis, pack/kicking game
              for rugby, meeting/racecard fields for horse racing). Pick{" "}
              <span className="font-semibold">{activeVertical.label}</span> above — prompts stay in one catalogue for every sport.
            </p>
          </div>
        ) : workflow === "report" ? (
          <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            <p className="font-bold text-[color:var(--text-primary)]">Match report (post-event)</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Lead with result and headline narrative</li>
              <li>Match summary — turning points from the feed</li>
              <li>Key moments — goals and red cards first; then VAR, disallowed goals, offsides and other major incidents exactly as the feed’s commentary describes them</li>
              <li>Optional player ratings (1–10) for <strong className="text-[color:var(--text-primary)]">both teams</strong> when you enable them on the fixture panel</li>
              <li>
                <strong className="text-[color:var(--text-primary)]">Preview carry-over:</strong> reuse venue, competition and
                stakes where still true; do not treat pre-match injuries or predicted XIs as final if the feed shows confirmed
                teams or changes
              </li>
            </ul>
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Builtin prompt: <strong className="text-[color:var(--text-secondary)]">Match report (with preview context)</strong>{" "}
              on the Prompts page — pair with BBC Sport rhythm references in the learning table below.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            <p className="font-bold text-[color:var(--text-primary)]">16 conclusions (post-match analysis)</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Exactly sixteen numbered takes as <strong className="text-[color:var(--text-primary)]">&lt;h3&gt;</strong> blocks
                after the headline and dek — opinion-forward but grounded in feed facts (no invented incidents)
              </li>
              <li>
                Compound <strong className="text-[color:var(--text-primary)]">&lt;h1&gt;</strong> with comma-separated hooks;
                optional LOOP social block as <strong className="text-[color:var(--text-primary)]">&lt;h2&gt;</strong>
              </li>
              <li>Same post-match digest as reports (final score, key moments, commentary); player ratings stay report-only</li>
              <li>
                Tick <strong className="text-[color:var(--text-primary)]">Football365 tone cues</strong> on the fixture panel for
                headline-shape hints without changing factual obligations
              </li>
            </ul>
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Series reference:{" "}
              <a
                href="https://www.football365.com/tag/16-conclusions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#22c55e] hover:underline"
              >
                Football365 — 16 Conclusions
              </a>
              . Builtin:{" "}
              <strong className="text-[color:var(--text-secondary)]">Data Studio — 16 conclusions (Planet Sport)</strong> on Prompts.
            </p>
          </div>
        )}
      </Panel>

      <div id="fixture-widget-map">
        <Panel title="Feed ↔ Football365 widgets & preview headers">
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
            Use this when normalising <strong className="text-[color:var(--text-primary)]">SportccFixture</strong>
            -style payloads: map JSON clusters to the match-centre tabs (Summary, Commentary, Stats, Line-ups, Table, H2H)
            and to long-form preview modules (team news, odds, prediction card, stats comparison, player duels). Exact field
            names depend on the provider — confirm against a live API response.
          </p>
          {vertical === "football" || vertical === "multi" ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-[color:var(--text-muted)]">
                    <th className="py-2 pr-3 font-semibold">Surface</th>
                    <th className="py-2 pr-3 font-semibold">Widget / header</th>
                    <th className="py-2 pr-3 font-semibold">Typical feed clusters</th>
                    <th className="py-2 pr-3 font-semibold">Preview article</th>
                    <th className="py-2 font-semibold">Match centre</th>
                  </tr>
                </thead>
                <tbody>
                  {FOOTBALL_FIXTURE_WIDGET_CATALOG.map((row) => (
                    <tr key={row.id} className="border-b border-[color:var(--border)]/70 align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-[color:var(--text-muted)]">
                        {row.uiSurface === "match_centre" ? "Match centre" : "Preview web"}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-[color:var(--text-primary)]">{row.widgetOrHeader}</td>
                      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{row.typicalFeedClusters}</td>
                      <td className="py-2.5 pr-3 text-[color:var(--text-secondary)]">{row.previewArticleUse}</td>
                      <td className="py-2.5 text-[color:var(--text-secondary)]">{row.matchCentreUse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">
              Widget matrix above is football-specific (F365 mobile + web). For {activeVertical.label}, reuse the same idea:
              header/meta + timeline + comparative stats + ladder/table + H2H + squad lists — wire prompts once your feed is
              normalised to the same conceptual clusters.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Match & fixture data">
          <h3 className="text-lg font-bold text-[color:var(--text-primary)]">{activeVertical.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{activeVertical.shortDescription}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{activeVertical.dataFeedNote}</p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-4">
            <Link href="/language-studio?tab=Imports">
              <R365Button>Open Imports</R365Button>
            </Link>
            <Link href="/language-studio?tab=Rewrite">
              <R365Button variant="ghost">Rewrite</R365Button>
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-[color:var(--text-muted)]">
            Use <strong className="text-[color:var(--text-secondary)]">Fixture feed</strong> above to pull SixLogics data,
            then route copy through Imports / Rewrite when wired to articles.
          </p>
        </Panel>

        <Panel title="Learning library">
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
            Articles, sites and brands you study for <strong className="text-[color:var(--text-primary)]">tone and shape</strong>
            — alongside Football365 / TEAMtalk / Planet Football imports in{" "}
            <Link href="/language-studio?tab=Imports" className="font-semibold text-[#22c55e] hover:underline">
              Language Studio
            </Link>
            . BBC links are for <strong className="text-[color:var(--text-primary)]">learning</strong>; owned and partner
            URLs belong in your import pipeline.
          </p>
          <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
            {filteredLearning.length} reference{filteredLearning.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-[color:var(--text-secondary)]">{activeVertical.label}</span>.
          </p>
        </Panel>
      </div>

      <Panel title="Filtered references">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-[color:var(--text-muted)]">
                <th className="py-2 pr-4 font-semibold">Kind</th>
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredLearning.map((row) => (
                <tr key={row.id} className="border-b border-[color:var(--border)]/70">
                  <td className="py-3 pr-4 align-top text-[color:var(--text-muted)]">{learningKindLabel(row.kind)}</td>
                  <td className="py-3 pr-4 align-top font-semibold text-[color:var(--text-primary)]">{row.name}</td>
                  <td className="py-3 pr-4 align-top text-[color:var(--text-secondary)]">
                    <span className="block">{row.description}</span>
                    {row.notes ? (
                      <span className="mt-1 block text-xs text-[color:var(--text-muted)]">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className="py-3 align-top">
                    {row.url ? (
                      row.url.startsWith("/") ? (
                        <Link href={row.url} className="font-semibold text-[#22c55e] hover:underline">
                          Open
                        </Link>
                      ) : (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#22c55e] hover:underline"
                        >
                          View
                        </a>
                      )
                    ) : (
                      <span className="text-[color:var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
