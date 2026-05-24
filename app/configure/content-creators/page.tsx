import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { BRAND_SUITE } from "@/app/lib/brand";
import {
  CONFIGURE_PATH,
  LANGUAGE_STUDIO_CREATORS_TAB,
} from "@/app/lib/configure/paths";
import { readLanguageStudioData } from "@/app/lib/language-studio/store";

export const metadata = {
  title: `Content Creator Profiles · ${BRAND_SUITE}`,
  description: "Content creator voice profiles for Planet Sport Studio AI workflows.",
};

export const dynamic = "force-dynamic";

export default async function ContentCreatorsPage() {
  const data = await readLanguageStudioData();
  const profiles = Object.values(data.journalistProfiles).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );
  const activeCount = profiles.filter((p) => p.active).length;
  const brands = [...new Set(profiles.map((p) => p.brand).filter(Boolean))].sort();

  return (
    <div className="space-y-8">
      <section
        className="rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href={CONFIGURE_PATH} className="text-sm font-semibold text-[color:var(--accent)] hover:underline">
          ← Configure
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">Configure</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-[color:var(--text-primary)]">Content Creator Profiles</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[color:var(--text-secondary)]">
          Content-creator voice profiles used by Match Report Builder, rewrites and translations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={LANGUAGE_STUDIO_CREATORS_TAB}>
            <R365Button>Manage profiles in Language Studio</R365Button>
          </Link>
        </div>
      </section>

      <Panel title="Overview">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-[color:var(--surface-muted)] p-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Total profiles</p>
            <p className="mt-1 text-2xl font-black text-[color:var(--text-primary)]">{profiles.length}</p>
          </div>
          <div className="rounded-xl border bg-[color:var(--surface-muted)] p-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Active</p>
            <p className="mt-1 text-2xl font-black text-[color:var(--text-primary)]">{activeCount}</p>
          </div>
          <div className="rounded-xl border bg-[color:var(--surface-muted)] p-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Brands</p>
            <p className="mt-1 text-2xl font-black text-[color:var(--text-primary)]">{brands.length}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Profiles">
        {profiles.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            No creator profiles yet. Import articles in Language Studio or add profiles manually.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-bold uppercase tracking-wide text-[color:var(--text-muted)]" style={{ borderColor: "var(--border)" }}>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Brand</th>
                  <th className="py-2 pr-4">Sports</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 pr-4 font-semibold text-[color:var(--text-primary)]">{profile.name}</td>
                    <td className="py-3 pr-4 text-[color:var(--text-secondary)]">{profile.brand || "—"}</td>
                    <td className="py-3 pr-4 text-[color:var(--text-secondary)]">
                      {profile.sports.length ? profile.sports.join(", ") : "—"}
                    </td>
                    <td className="py-3 pr-4 capitalize text-[color:var(--text-muted)]">{profile.source}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          profile.active
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {profile.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
