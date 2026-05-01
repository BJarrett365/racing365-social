import Link from "next/link";
import { Montserrat } from "next/font/google";
import { BRAND_MARK, BRAND_SLOGAN } from "@/app/lib/brand";
import { AuthControls } from "@/app/components/AuthControls";
import { ThemeToggle } from "@/app/components/ThemeToggle";

/** Geometric sans aligned with the logo wordmark style (see /brand/plexa-logo.png). */
const plexaFont = Montserrat({
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/editing-studio", label: "Schedule Studio" },
  { href: "/live", label: "Live Control" },
  { href: "/templates", label: "Shorts" },
  { href: "/landscape", label: "Landscape" },
  { href: "/podcast-template", label: "Podcast" },
  { href: "/article-studio", label: "Article Studio" },
  { href: "/language-studio", label: "Language Studio" },
  { href: "/tools", label: "Tools" },
  { href: "/library", label: "Library" },
  { href: "/admin", label: "Admin" },
];

const footerLinks = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/editing-studio", label: "Schedule Studio" },
  { href: "/live", label: "Live Control" },
  { href: "/prompts", label: "Prompts" },
  { href: "/brand-guidelines", label: "Brand Guidelines" },
  { href: "/guard-rails", label: "Guard Rails" },
  { href: "/docs/news-shorts-manual", label: "News Shorts manual" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="border-b backdrop-blur sticky top-0 z-50"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 95%, transparent)" }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center">
            <div className="flex min-w-0 flex-col gap-1 leading-tight">
              <span
                className={`${plexaFont.className} text-2xl font-extrabold tracking-[0.14em] sm:text-3xl`}
                style={{ color: "var(--r365-gold)" }}
              >
                {BRAND_MARK}
              </span>
              <span
                className={`${plexaFont.className} text-[11px] font-semibold tracking-[0.08em] sm:text-xs`}
                style={{ color: "var(--r365-gold)" }}
              >
                {BRAND_SLOGAN}
              </span>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-1 text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="app-nav-link rounded-md px-3 py-2 transition"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <AuthControls />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8">{children}</main>
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <nav className="flex flex-wrap gap-2 text-sm">
            {footerLinks.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="app-nav-link rounded-md px-3 py-2 transition"
                style={{ color: "var(--text-secondary)" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
