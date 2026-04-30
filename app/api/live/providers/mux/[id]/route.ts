import { NextResponse } from "next/server";
import { assertAdminWrite } from "@/app/lib/admin-auth";
import { getMuxLiveStream } from "@/features/live-control/services/mux-provider-service";
import { getMuxStreamRecordAsync, upsertMuxStreamFromLiveDataAsync } from "@/features/live-control/services/mux-stream-store";

/**
 * Latest Mux live stream + persisted Plexa provider record (`id` = Mux live stream id).
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = assertAdminWrite(request);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const stored = await getMuxStreamRecordAsync(id);

  try {
    const { data } = await getMuxLiveStream(id);
    const record = await upsertMuxStreamFromLiveDataAsync(data);
    return NextResponse.json({ record, live: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mux get failed";
    if (!stored) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ record: stored, live: null, error: message });
  }
}
