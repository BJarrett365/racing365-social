import { AudioGuestJoinClient } from "./AudioGuestJoinClient";

export const dynamic = "force-dynamic";

export default async function AudioGuestJoinPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <AudioGuestJoinClient sessionId={sessionId} />;
}
