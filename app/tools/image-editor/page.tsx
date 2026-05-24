import { Suspense } from "react";
import { AiImageEditorClient } from "@/app/tools/image-editor/AiImageEditorClient";

export default function ImageEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[color:var(--text-muted)]">Loading image editor…</div>}>
      <AiImageEditorClient />
    </Suspense>
  );
}
