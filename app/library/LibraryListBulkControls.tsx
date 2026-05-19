"use client";

import { R365Button } from "@/app/components/R365Button";

export const LIBRARY_PAGE_SIZE = 20;

export function paginateSlice<T>(items: T[], page: number, pageSize: number): {
  slice: T[];
  pageCount: number;
  total: number;
  activePage: number;
} {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const activePage = Math.min(Math.max(1, page), pageCount);
  const start = (activePage - 1) * pageSize;
  return { slice: items.slice(start, start + pageSize), pageCount, total, activePage };
}

export function LibraryPaginationBar({
  activePage,
  pageCount,
  total,
  pageSize,
  onPageChange,
  idPrefix,
}: {
  activePage: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (next: number) => void;
  idPrefix: string;
}) {
  if (pageCount <= 1 && total <= pageSize) return null;
  const safePage = Math.min(Math.max(1, activePage), pageCount);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3 text-xs text-[color:var(--text-muted)]"
      role="navigation"
      aria-label="Pagination"
    >
      <span className="tabular-nums">
        {total === 0 ? "No items" : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, total)} of ${total}`}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          id={`${idPrefix}-prev`}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 font-semibold text-[color:var(--text-primary)] disabled:opacity-40"
        >
          Previous
        </button>
        <span className="tabular-nums">
          Page {safePage} / {pageCount}
        </span>
        <button
          type="button"
          id={`${idPrefix}-next`}
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 font-semibold text-[color:var(--text-primary)] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function LibraryBulkSelectionBar({
  pageKeys,
  selected,
  onToggleSelectAllOnPage,
  onClearSelection,
  onDeleteSelected,
  deleteBusy,
  deleteDisabled,
  selectionCountTotal,
}: {
  pageKeys: string[];
  selected: Set<string>;
  onToggleSelectAllOnPage: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  deleteBusy: boolean;
  deleteDisabled?: boolean;
  selectionCountTotal: number;
}) {
  const onPage = pageKeys.filter((k) => selected.has(k)).length;
  const allOnPageSelected = pageKeys.length > 0 && onPage === pageKeys.length;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs">
      <label className="flex cursor-pointer items-center gap-2 text-[color:var(--text-primary)]">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[color:var(--border)]"
          checked={allOnPageSelected}
          onChange={onToggleSelectAllOnPage}
          disabled={pageKeys.length === 0}
        />
        Select all on this page ({pageKeys.length})
      </label>
      <span className="text-[color:var(--text-muted)]">
        {selectionCountTotal} selected total
        {onPage > 0 && onPage < selectionCountTotal ? ` · ${onPage} on this page` : null}
      </span>
      <button
        type="button"
        className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline disabled:opacity-40"
        onClick={onClearSelection}
        disabled={selectionCountTotal === 0}
      >
        Clear selection
      </button>
      <R365Button
        type="button"
        variant="danger"
        className="!py-1 !text-xs"
        disabled={deleteBusy || selectionCountTotal === 0 || deleteDisabled}
        onClick={onDeleteSelected}
      >
        {deleteBusy ? "Deleting…" : `Delete selected (${selectionCountTotal})`}
      </R365Button>
    </div>
  );
}
