import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/app/components/AppShell";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { BRAND_SUITE, BRAND_TAGLINE } from "@/app/lib/brand";
import { getThemeBootstrapScript } from "@/app/lib/theme-constants";
import { ukRegionalMetadataRoot, UK_DOCUMENT_LANG } from "@/app/lib/uk-seo";

export const metadata: Metadata = {
  title: BRAND_SUITE,
  description: BRAND_TAGLINE,
  ...ukRegionalMetadataRoot(BRAND_SUITE, BRAND_TAGLINE),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={UK_DOCUMENT_LANG} suppressHydrationWarning={true}>
      <head>
        <script
          id="plexa-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }}
        />
      </head>
      <body className="min-h-screen antialiased font-sans" suppressHydrationWarning={true}>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
