import { PlexaAssistant } from "@/app/components/PlexaAssistant";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Ask Plexa Popout · ${BRAND_SUITE}`,
};

export default function AskPlexaPopoutPage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] p-2">
      <PlexaAssistant embedded defaultOpen />
    </main>
  );
}
