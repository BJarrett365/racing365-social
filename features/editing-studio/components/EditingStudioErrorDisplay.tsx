"use client";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function EditingStudioErrorDisplay({ message, onRetry }: Props) {
  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}
      role="alert"
      aria-live="assertive"
    >
      <p className="font-semibold text-[color:var(--danger)]">Something went wrong</p>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-4 rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
