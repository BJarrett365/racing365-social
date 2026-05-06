import Link from "next/link";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Admin · ${BRAND_SUITE}`,
};

const adminLinks = [
  {
    title: "Users and permissions",
    href: "/admin/users-and-permissions",
    description: "Invite registered users and manage meeting, audio, editor and admin roles.",
    status: "Admin",
  },
  {
    title: "Theme and display",
    href: "/admin/theme-and-display",
    description: "Manage Plexa display settings, visual defaults and theme controls.",
    status: "Admin",
  },
  {
    title: "Provider keys and platform services",
    href: "/admin/provider-keys-and-platform-services",
    description: "Manage OpenAI, ElevenLabs, Daily, video, live and translation/localisation providers.",
    status: "Admin",
  },
  {
    title: "R&D Reports",
    href: "/admin/reports",
    description: "View AI Studio R&D assessment, technical report, barriers and evidence notes.",
    status: "Live",
  },
  {
    title: "Admin About",
    href: "/admin/about",
    description: "Product, environment and local access notes for the current build.",
    status: "Live",
  },
  {
    title: "Theme Preview",
    href: "/admin/theme-preview",
    description: "Check Plexa Studio surfaces, typography, panels and theme tokens.",
    status: "Live",
  },
  {
    title: "API Client Access",
    href: "/language-studio?tab=Client%20Access",
    description: "Manage Language Studio client access and API-style delivery controls.",
    status: "Admin",
  },
  {
    title: "Export Feeds",
    href: "/language-studio?tab=Export%20Feeds",
    description: "Configure export feed destinations, XML/JSON output settings and delivery governance.",
    status: "Admin",
  },
];

const adminAreas = [
  {
    label: "User Access",
    value: "Secure",
    description: "Invite and manage verified Plexa Studio users.",
  },
  {
    label: "Platform APIs",
    value: "Keys",
    description: "OpenAI, Runway, ElevenLabs, Apify, Mux, Livepeer and tool paths.",
  },
  {
    label: "Language Engine",
    value: "Providers",
    description: "OpenAI / DeepL mode, localisation model and translation settings.",
  },
  {
    label: "R&D Evidence",
    value: "Reports",
    description: "Track product direction, failures, barriers and technical uncertainty.",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#1f2d26] bg-[#0a0e0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Platform Admin</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Plexa Studio Control Panel</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Manage users, provider keys, language settings, R&D reports and operational references for this
              Plexa Studio environment. In production, set{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-slate-300">ADMIN_TOKEN</code> in the server
              environment before saving protected settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/reports" className="rounded-md bg-[#eab308] px-4 py-2 text-sm font-bold text-black hover:opacity-95">
              Open R&D Reports
            </Link>
            <Link href="/product" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300 hover:border-[#22c55e]/50">
              Product Page
            </Link>
            <Link href="/how-it-works" className="rounded-md border border-[#1f2d26] px-4 py-2 text-sm font-semibold text-slate-300 hover:border-[#22c55e]/50">
              How It Works
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {adminAreas.map((area) => (
          <div key={area.label} className="rounded-xl border border-[#1f2d26] bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{area.label}</p>
            <p className="mt-2 text-2xl font-black text-white">{area.value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{area.description}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22c55e]">Admin Pages</p>
          <h2 className="mt-1 text-2xl font-black text-white">Settings, access and reference</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-[#1f2d26] bg-[#0a0e0c] p-4 transition hover:border-[#22c55e]/50"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 py-0.5 text-xs font-bold text-[#22c55e]">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#eab308]">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
