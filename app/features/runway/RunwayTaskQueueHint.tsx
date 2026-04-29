"use client";

/** Runway returns PENDING / THROTTLED while a task waits in queue (especially at concurrency limits). */
export function RunwayTaskQueueHint(props: { status?: string; modality: "video" | "image" }) {
  const { status, modality } = props;
  if (status === "THROTTLED") {
    return (
      <p className="mt-2 text-[10px] leading-relaxed text-amber-200/90">
        <strong className="text-amber-100">Throttled</strong>
        {" — "}
        {modality === "video"
          ? "Runway stored this job but has not started it yet because your organization is at its concurrent video limit (image→video shares that pool with text→video and similar). It should advance automatically in submission order — you do not need to resubmit."
          : "Runway stored this job but has not started it yet because your organization is at its concurrent image limit. It should advance automatically — you do not need to resubmit."}{" "}
        This page polls every 5s. See{" "}
        <a
          href="https://docs.dev.runwayml.com/usage/tiers/"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[#86efac] underline"
        >
          API usage tiers and limits
        </a>
        .
      </p>
    );
  }
  if (status === "PENDING") {
    return (
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        <strong className="text-slate-400">Pending</strong> — queued and waiting to start. Status updates every 5
        seconds.
      </p>
    );
  }
  return null;
}
