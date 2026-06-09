import { DevGatewayClient } from "@/app/dev-gateway/DevGatewayClient";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Plexa Dev Gateway · ${BRAND_SUITE}`,
};

export default function DevGatewayPage() {
  return <DevGatewayClient />;
}
