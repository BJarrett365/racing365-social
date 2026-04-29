import { Suspense } from "react";
import { NewsShortsBuilder } from "@/app/features/news-shorts/NewsShortsBuilder";

export default function NewsShortsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading…</div>}>
      <NewsShortsBuilder />
    </Suspense>
  );
}
