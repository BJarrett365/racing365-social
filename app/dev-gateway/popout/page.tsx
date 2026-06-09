import { PlexaGatewayPopout } from "@/app/components/PlexaGatewayPopout";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Plexa Gateway Popout · ${BRAND_SUITE}`,
};

export default function DevGatewayPopoutPage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] p-2">
      <PlexaGatewayPopout embedded defaultOpen />
    </main>
  );
}
