import { NextResponse } from "next/server";
import {
  decideEditorialLearningProposal,
  listEditorialLearningProposals,
} from "@/app/lib/editorial-brain/store";

export const dynamic = "force-dynamic";

type Body = {
  proposalId?: string;
  action?: "approve" | "reject";
  reason?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const proposals = await listEditorialLearningProposals(
    status === "pending" || status === "approved" || status === "rejected" ? status : undefined,
  );
  return NextResponse.json({ proposals });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.proposalId || (body.action !== "approve" && body.action !== "reject")) {
      return NextResponse.json({ error: "proposalId and action are required." }, { status: 400 });
    }
    const result = await decideEditorialLearningProposal({
      proposalId: body.proposalId,
      status: body.action === "approve" ? "approved" : "rejected",
      reason: body.reason,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proposal update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
