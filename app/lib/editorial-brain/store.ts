import "server-only";

import { newLanguageId, readLanguageStudioData, writeLanguageStudioData } from "@/app/lib/language-studio/store";
import type {
  ArticleFactCheck,
  EditorialLearningProposal,
  EditorialLearningProposalStatus,
  LanguageAuditLog,
  LanguageKnowledgeFile,
} from "@/app/lib/language-studio/types";

export async function listEditorialLearningProposals(status?: EditorialLearningProposalStatus): Promise<EditorialLearningProposal[]> {
  const data = await readLanguageStudioData();
  return Object.values(data.editorialLearningProposals)
    .filter((proposal) => !status || proposal.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertEditorialLearningProposal(
  proposal: Omit<EditorialLearningProposal, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string },
): Promise<EditorialLearningProposal> {
  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const id = proposal.id?.trim() || newLanguageId("elprop");
  const next: EditorialLearningProposal = {
    ...proposal,
    id,
    approvalRequired: true,
    confidence: Math.min(100, Math.max(0, Math.round(proposal.confidence))),
    evidence: proposal.evidence.map((item) => item.trim()).filter(Boolean),
    createdAt: proposal.createdAt ?? data.editorialLearningProposals[id]?.createdAt ?? now,
    updatedAt: now,
  };
  data.editorialLearningProposals[id] = next;
  await writeLanguageStudioData(data);
  return next;
}

export async function storeArticleFactCheck(
  factCheck: Omit<ArticleFactCheck, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string },
): Promise<ArticleFactCheck> {
  const data = await readLanguageStudioData();
  const now = new Date().toISOString();
  const id = factCheck.id?.trim() || newLanguageId("afcheck");
  const next: ArticleFactCheck = {
    ...factCheck,
    id,
    createdAt: factCheck.createdAt ?? data.articleFactChecks[id]?.createdAt ?? now,
    updatedAt: now,
  };
  data.articleFactChecks[id] = next;
  await writeLanguageStudioData(data);
  return next;
}

export async function decideEditorialLearningProposal(params: {
  proposalId: string;
  status: "approved" | "rejected";
  reason?: string;
}): Promise<{ proposal: EditorialLearningProposal; knowledgeFile?: LanguageKnowledgeFile }> {
  const data = await readLanguageStudioData();
  const proposal = data.editorialLearningProposals[params.proposalId];
  if (!proposal) throw new Error("Learning proposal not found.");
  const now = new Date().toISOString();
  const next: EditorialLearningProposal = {
    ...proposal,
    status: params.status,
    decisionReason: params.reason?.trim() || undefined,
    decidedAt: now,
    updatedAt: now,
  };
  data.editorialLearningProposals[next.id] = next;

  let knowledgeFile: LanguageKnowledgeFile | undefined;
  if (params.status === "approved" && proposal.type === "factcheck") {
    knowledgeFile = {
      id: newLanguageId("lknowledge"),
      title: `Approved learning: ${proposal.title}`,
      kind: "quality-fix",
      language: "",
      content: [
        `Learning type: ${proposal.type}`,
        `Summary: ${proposal.summary}`,
        `Confidence: ${proposal.confidence}`,
        `Evidence: ${proposal.evidence.join("; ")}`,
        `Before: ${proposal.before}`,
        `After: ${proposal.after}`,
        `Impact: ${proposal.impact}`,
      ].join("\n"),
      createdAt: now,
      updatedAt: now,
    };
    data.knowledgeFiles[knowledgeFile.id] = knowledgeFile;
  }

  const auditId = newLanguageId("laudit");
  const audit: LanguageAuditLog = {
    id: auditId,
    entityType: "editorial_learning_proposal",
    entityId: proposal.id,
    action: params.status === "approved" ? "approve_editorial_learning" : "reject_editorial_learning",
    detail: params.reason,
    createdAt: now,
  };
  data.auditLogs[audit.id] = audit;

  await writeLanguageStudioData(data);
  return { proposal: next, knowledgeFile };
}
