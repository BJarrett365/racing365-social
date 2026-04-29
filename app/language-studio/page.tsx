import { LanguageStudioClient } from "@/app/language-studio/LanguageStudioClient";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Language Studio · ${BRAND_SUITE}`,
};

export default function LanguageStudioPage() {
  return <LanguageStudioClient />;
}
