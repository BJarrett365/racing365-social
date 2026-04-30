import fs from "fs/promises";
import path from "path";
import { readJsonBlob, shouldUseNetlifyBlobStore, writeJsonBlob } from "@/app/lib/netlify-blob-json";
import { EDITING_STUDIO_STORE_FILE } from "@/features/editing-studio/lib/constants";
import { newEditingStudioId } from "@/features/editing-studio/lib/new-id";
import { parseEditingStudioStoreJson, serializeEditingStudioStore } from "@/features/editing-studio/lib/mappers";
import { listChangedEditingProjectFields } from "@/features/editing-studio/revisions/list-changed-fields";
import { buildMockEditingStudioStore } from "@/features/editing-studio/seed/mock-seed";
import type {
  EditingProject,
  EditingExportRun,
  EditingProjectRevision,
  EditingProjectRevisionSummary,
  EditingRevisionActor,
  EditingStudioStoreV2,
} from "@/features/editing-studio/types/domain";
import type { EditingWorkflowRole } from "@/features/editing-studio/types/workflow";
import { appendWorkflowCommentEntry } from "@/features/editing-studio/workflow/workflow-comments";
import {
  editingProjectCreateSchema,
  editingProjectPatchSchema,
} from "@/features/editing-studio/validators/editing-studio-schemas";

const MAX_REVISIONS_PER_PROJECT = 80;
const BLOB_STORE_NAME = "plexa-editing-studio";
const BLOB_STORE_KEY = "editing-studio-store.json";

function nowIso(): string {
  return new Date().toISOString();
}

function cloneProject(p: EditingProject): EditingProject {
  return JSON.parse(JSON.stringify(p)) as EditingProject;
}

function assertValidIsoDate(s: string): void {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date string");
  }
}

export type WorkflowMutationMeta = {
  role: EditingWorkflowRole;
  actor: EditingRevisionActor;
  note?: string;
};

function emptyStore(): EditingStudioStoreV2 {
  return { version: 2, projects: {}, exports: {}, revisions: {}, revisionIdsByProject: {} };
}

/**
 * File-backed store under data/local (gitignored). First read seeds mock data if missing.
 */
export class EditingStudioRepository {
  private storePath(): string {
    return path.join(process.cwd(), EDITING_STUDIO_STORE_FILE);
  }

  async readStore(): Promise<EditingStudioStoreV2> {
    if (shouldUseNetlifyBlobStore()) {
      const data = await readJsonBlob<unknown>(BLOB_STORE_NAME, BLOB_STORE_KEY);
      if (data) {
        const parsed = parseEditingStudioStoreJson(JSON.stringify(data));
        if (!parsed.ok) {
          throw new Error(`Invalid Editing Studio store: ${parsed.error}`);
        }
        return parsed.data;
      }
      const seed = buildMockEditingStudioStore();
      await this.writeStore(seed);
      return seed;
    }

    const full = this.storePath();
    try {
      const raw = await fs.readFile(full, "utf-8");
      const parsed = parseEditingStudioStoreJson(raw);
      if (!parsed.ok) {
        throw new Error(`Invalid Editing Studio store: ${parsed.error}`);
      }
      return parsed.data;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        const seed = buildMockEditingStudioStore();
        await this.writeStore(seed);
        return seed;
      }
      throw e;
    }
  }

  async writeStore(store: EditingStudioStoreV2): Promise<void> {
    if (shouldUseNetlifyBlobStore()) {
      await writeJsonBlob(BLOB_STORE_NAME, BLOB_STORE_KEY, store);
      return;
    }

    const full = this.storePath();
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, serializeEditingStudioStore(store), "utf-8");
  }

  /** Reset store to empty (tests / admin). */
  async resetStoreEmpty(): Promise<void> {
    await this.writeStore(emptyStore());
  }

  private finalizeProjectUpdate(
    store: EditingStudioStoreV2,
    id: string,
    previous: EditingProject,
    next: EditingProject,
    opts?: { actor?: EditingRevisionActor; note?: string },
  ): void {
    store.projects[id] = next;
    const fieldsChanged = listChangedEditingProjectFields(previous, next);
    this.appendRevision(store, {
      projectId: id,
      kind: "save",
      projectRevisionAfter: next.revision,
      createdAt: next.updatedAt,
      changedBy: { ...opts?.actor, source: "api" },
      fieldsChanged: fieldsChanged.length ? fieldsChanged : ["project"],
      note: opts?.note,
      snapshot: cloneProject(next),
    });
  }

  private appendRevision(store: EditingStudioStoreV2, row: Omit<EditingProjectRevision, "id">): void {
    const id = newEditingStudioId("rev");
    const revision: EditingProjectRevision = { ...row, id };
    store.revisions[id] = revision;
    const prev = store.revisionIdsByProject[revision.projectId] ?? [];
    const next = [id, ...prev];
    if (next.length > MAX_REVISIONS_PER_PROJECT) {
      const drop = next.slice(MAX_REVISIONS_PER_PROJECT);
      for (const rid of drop) {
        delete store.revisions[rid];
      }
      store.revisionIdsByProject[revision.projectId] = next.slice(0, MAX_REVISIONS_PER_PROJECT);
    } else {
      store.revisionIdsByProject[revision.projectId] = next;
    }
  }

  async listProjects(options?: { includeArchived?: boolean }): Promise<EditingProject[]> {
    const store = await this.readStore();
    const list = Object.values(store.projects);
    const filtered = options?.includeArchived ? list : list.filter((p) => p.status !== "archived");
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string): Promise<EditingProject | null> {
    const store = await this.readStore();
    return store.projects[id] ?? null;
  }

  async createProject(input: unknown, opts?: { actor?: EditingRevisionActor }): Promise<EditingProject> {
    const parsed = editingProjectCreateSchema.parse(input);
    const store = await this.readStore();
    const ts = nowIso();
    const id = newEditingStudioId("ed");
    const project: EditingProject = {
      id,
      title: parsed.title,
      publicHeadline: parsed.publicHeadline,
      summary: parsed.summary,
      bodyNotes: parsed.bodyNotes,
      editorialCopy: parsed.editorialCopy,
      sourceUrl: parsed.sourceUrl,
      brand: parsed.brand,
      thumbnailRel: parsed.thumbnailRel,
      description: parsed.description,
      status: parsed.status ?? "draft",
      contentType: parsed.contentType ?? "link_post",
      platforms: [...(parsed.platforms ?? [])],
      assets: [...(parsed.assets ?? [])],
      copyVariants: [...(parsed.copyVariants ?? [])],
      exportVariantPick: parsed.exportVariantPick,
      editorialSettings: parsed.editorialSettings ? { ...parsed.editorialSettings } : undefined,
      revision: 1,
      scheduledAt: undefined,
      publishedAt: undefined,
      archivedAt: undefined,
      integrationMeta: parsed.integrationMeta,
      createdAt: ts,
      updatedAt: ts,
    };
    store.projects[id] = project;
    this.appendRevision(store, {
      projectId: id,
      kind: "create",
      projectRevisionAfter: project.revision,
      createdAt: ts,
      changedBy: { ...opts?.actor, source: "create" },
      fieldsChanged: ["project"],
      snapshot: cloneProject(project),
    });
    await this.writeStore(store);
    return project;
  }

  async updateProject(
    id: string,
    patch: unknown,
    opts?: { actor?: EditingRevisionActor; note?: string },
  ): Promise<EditingProject | null> {
    const parsed = editingProjectPatchSchema.parse(patch);
    const store = await this.readStore();
    const existing = store.projects[id];
    if (!existing) return null;

    const next: EditingProject = { ...existing };
    let changed = false;

    const assign = <K extends keyof EditingProject>(key: K, value: EditingProject[K] | undefined) => {
      if (value === undefined) return;
      (next as EditingProject)[key] = value;
      changed = true;
    };

    assign("title", parsed.title);
    assign("publicHeadline", parsed.publicHeadline);
    assign("summary", parsed.summary);
    assign("bodyNotes", parsed.bodyNotes);
    assign("editorialCopy", parsed.editorialCopy);
    assign("sourceUrl", parsed.sourceUrl);
    assign("brand", parsed.brand);
    assign("thumbnailRel", parsed.thumbnailRel);
    assign("description", parsed.description);
    assign("status", parsed.status);
    assign("contentType", parsed.contentType);
    if (parsed.platforms !== undefined) {
      next.platforms = [...parsed.platforms];
      changed = true;
    }
    if (parsed.assets !== undefined) {
      next.assets = [...parsed.assets];
      changed = true;
    }
    if (parsed.copyVariants !== undefined) {
      next.copyVariants = [...parsed.copyVariants];
      changed = true;
    }
    if (parsed.exportVariantPick !== undefined) {
      next.exportVariantPick = { ...parsed.exportVariantPick };
      changed = true;
    }
    if (parsed.editorialSettings !== undefined) {
      next.editorialSettings = { ...(existing.editorialSettings ?? {}), ...parsed.editorialSettings };
      changed = true;
    }
    assign("scheduledAt", parsed.scheduledAt);
    assign("publishedAt", parsed.publishedAt);
    assign("archivedAt", parsed.archivedAt);
    if (parsed.integrationMeta !== undefined) {
      next.integrationMeta = parsed.integrationMeta;
      changed = true;
    }

    if (!changed) {
      return existing;
    }

    next.revision = existing.revision + 1;
    next.updatedAt = nowIso();
    this.finalizeProjectUpdate(store, id, existing, next, opts);

    await this.writeStore(store);
    return next;
  }

  async workflowSubmitForReview(projectId: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status !== "draft") throw new Error("Only drafts can be submitted for review");

    const noteText = meta.note?.trim() ?? "";
    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: noteText || "Submitted for review",
      kind: "submit_review",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      status: "in_review",
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowApprove(projectId: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status !== "in_review") throw new Error("Approve is only valid while in review");

    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: meta.note?.trim() || "Approved",
      kind: "approve",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      status: "approved",
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowReject(projectId: string, meta: WorkflowMutationMeta & { note: string }): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status !== "in_review") throw new Error("Reject is only valid while in review");

    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: meta.note.trim(),
      kind: "reject",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      status: "draft",
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowSchedule(projectId: string, scheduledAt: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    assertValidIsoDate(scheduledAt);
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status !== "approved") throw new Error("Schedule is only valid when approved");

    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: meta.note?.trim() || `Scheduled for ${scheduledAt}`,
      kind: "schedule",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      status: "scheduled",
      scheduledAt,
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowPublish(projectId: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status !== "scheduled" && existing.status !== "approved") {
      throw new Error("Publish requires status approved or scheduled");
    }

    const ts = nowIso();
    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: meta.note?.trim() || "Published",
      kind: "publish",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      status: "published",
      publishedAt: ts,
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: ts,
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowArchive(projectId: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");
    if (existing.status === "archived") throw new Error("Already archived");

    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body: meta.note?.trim() || "Archived",
      kind: "archive",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const ts = nowIso();
    const next: EditingProject = {
      ...cloneProject(existing),
      status: "archived",
      archivedAt: ts,
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: ts,
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor, note: meta.note });
    await this.writeStore(store);
    return next;
  }

  async workflowAddComment(projectId: string, body: string, meta: WorkflowMutationMeta): Promise<EditingProject> {
    const store = await this.readStore();
    const existing = store.projects[projectId];
    if (!existing) throw new Error("Project not found");

    const comments = appendWorkflowCommentEntry(existing.workflowComments, {
      body,
      kind: "comment",
      role: meta.role,
      displayName: meta.actor.displayName,
    });

    const next: EditingProject = {
      ...cloneProject(existing),
      workflowComments: comments,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    this.finalizeProjectUpdate(store, projectId, existing, next, { actor: meta.actor });
    await this.writeStore(store);
    return next;
  }

  async listProjectRevisionSummaries(projectId: string): Promise<EditingProjectRevisionSummary[]> {
    const store = await this.readStore();
    const ids = store.revisionIdsByProject[projectId] ?? [];
    const out: EditingProjectRevisionSummary[] = [];
    for (const rid of ids) {
      const r = store.revisions[rid];
      if (!r) continue;
      const { snapshot: _s, ...summary } = r;
      out.push(summary);
    }
    return out;
  }

  async getProjectRevision(revisionId: string): Promise<EditingProjectRevision | null> {
    const store = await this.readStore();
    return store.revisions[revisionId] ?? null;
  }

  async rollbackProject(
    projectId: string,
    revisionId: string,
    opts?: { actor?: EditingRevisionActor; note?: string },
  ): Promise<EditingProject | null> {
    const store = await this.readStore();
    const rev = store.revisions[revisionId];
    if (!rev || rev.projectId !== projectId) return null;
    const existing = store.projects[projectId];
    if (!existing) return null;

    const restored: EditingProject = {
      ...cloneProject(rev.snapshot),
      id: existing.id,
      createdAt: existing.createdAt,
      revision: existing.revision + 1,
      updatedAt: nowIso(),
    };

    const fieldsChanged = listChangedEditingProjectFields(existing, restored);
    store.projects[projectId] = restored;

    this.appendRevision(store, {
      projectId,
      kind: "rollback",
      projectRevisionAfter: restored.revision,
      createdAt: restored.updatedAt,
      changedBy: { ...opts?.actor, source: "rollback" },
      fieldsChanged: fieldsChanged.length ? fieldsChanged : ["rollback"],
      note: opts?.note ?? `Restored from revision ${revisionId}`,
      snapshot: cloneProject(restored),
    });

    await this.writeStore(store);
    return restored;
  }

  /** Soft-delete: set status archived + archivedAt. */
  async archiveProject(id: string): Promise<EditingProject | null> {
    return this.updateProject(id, {
      status: "archived",
      archivedAt: nowIso(),
    });
  }

  /** Remove project and dependent exports (use sparingly; prefer archive). */
  async deleteProjectPermanent(id: string): Promise<boolean> {
    const store = await this.readStore();
    if (!store.projects[id]) return false;
    delete store.projects[id];
    for (const [eid, exp] of Object.entries(store.exports)) {
      if (exp.projectId === id) {
        delete store.exports[eid];
      }
    }
    const revIds = store.revisionIdsByProject[id] ?? [];
    for (const rid of revIds) {
      delete store.revisions[rid];
    }
    delete store.revisionIdsByProject[id];
    await this.writeStore(store);
    return true;
  }

  /** Attach an export record (publishing integrations / downloads). */
  async addExport(
    partial: Omit<EditingExportRun, "id" | "createdAt"> & { id?: string },
  ): Promise<EditingExportRun> {
    const store = await this.readStore();
    const id = partial.id ?? newEditingStudioId("exp");
    const row: EditingExportRun = {
      ...partial,
      id,
      createdAt: nowIso(),
    };
    store.exports[id] = row;
    await this.writeStore(store);
    return row;
  }

  async listExportsForProject(projectId: string): Promise<EditingExportRun[]> {
    const store = await this.readStore();
    return Object.values(store.exports)
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

let _singleton: EditingStudioRepository | null = null;

export function getEditingStudioRepository(): EditingStudioRepository {
  if (!_singleton) {
    _singleton = new EditingStudioRepository();
  }
  return _singleton;
}
