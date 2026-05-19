/** Netlify runtime detection shared by `paths`, blob stores, and serverless Puppeteer (see `@netlify/blobs` readme). */

type GlobalWithNetlifyBlobs = typeof globalThis & { netlifyBlobsContext?: string };

/**
 * True when Blobs/runtime looks Netlify-hosted: build flag, env blob context,
 * or `globalThis.netlifyBlobsContext` injected on SSR.
 */
export function hasNetlifyBlobExecutionContext(): boolean {
  if (process.env.NETLIFY === "true") return true;
  const fromEnv = process.env.NETLIFY_BLOBS_CONTEXT?.trim();
  if (fromEnv) return true;
  const ctx = (globalThis as GlobalWithNetlifyBlobs).netlifyBlobsContext?.trim?.();
  return typeof ctx === "string" && ctx.length > 0;
}

/**
 * Hosted Netlify serverless (Next SSR / API routes on Lambda): `SITE_ID` is injected;
 * note `NETLIFY=true` is [build-centric](https://docs.netlify.com/build/configure-builds/environment-variables#read-only-variables), not reliably set at function runtime.
 */
export function isNetlifyHostedLambdaRuntime(): boolean {
  if (typeof process.env.SITE_ID !== "string" || !process.env.SITE_ID.trim()) return false;
  // Netlify’s Next runtime is Lambda-backed but may omit `AWS_LAMBDA_FUNCTION_NAME`; these are still AWS Lambda signals.
  return Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV?.includes("AWS_Lambda") ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

/** Writable filesystem under tmp for FFmpeg, renders, uploads, and disk mirror paths. */
export function usesEphemeralOutputRootRuntime(): boolean {
  return (
    process.env.VERCEL === "1" || hasNetlifyBlobExecutionContext() || isNetlifyHostedLambdaRuntime()
  );
}
