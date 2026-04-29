"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0e0c", color: "#fecaca", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, color: "#fff" }}>PLEXA — fatal error</h1>
        <p style={{ marginTop: 12, fontSize: 14 }}>{error.message}</p>
        <p style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>
          From the project folder run: <code style={{ color: "#86efac" }}>npm run dev:kill-port</code> then{" "}
          <code style={{ color: "#86efac" }}>npm run dev</code>
          <br />
          Do not use <code>npm start</code> until you have run <code>npm run build</code>.
        </p>
        <button
          type="button"
          style={{
            marginTop: 20,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#7f1d1d",
            color: "#fff",
            cursor: "pointer",
          }}
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
