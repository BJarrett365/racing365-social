import { LanguageStudioClient } from "@/app/language-studio/LanguageStudioClient";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Language Studio · ${BRAND_SUITE}`,
  description:
    "Translation, localisation, glossary and governance for sports publishers — imports, rewrites, review queues and XML/JSON export feeds.",
};

export default function LanguageStudioPage() {
  return <LanguageStudioClient />;
}
