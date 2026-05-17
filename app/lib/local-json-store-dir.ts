import path from "path";
import { projectRoot } from "@/app/lib/paths";

/**
 * Directory for small JSON files. Defaults to `data/local` on a normal checkout,
 * but serverless deploy bundles are often read-only (e.g. AWS Lambda `/var/task`),
 * so we use `TMPDIR`/`/tmp` there unless overridden.
 *
 * **Durability:** Ephemeral `/tmp` is per execution environment and not shared across
 * all concurrent instances. For production persistence, set `LOCAL_JSON_STORE_DIR`
 * to a mounted volume or migrate to blob/DB storage.
 */
export function localJsonStoreDir(): string {
  const explicit = process.env.LOCAL_JSON_STORE_DIR?.trim();
  if (explicit) return path.resolve(explicit);

  const serverless =
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    Boolean(process.env.VERCEL) ||
    process.env.NETLIFY === "true";

  if (serverless) {
    const base = process.env.TMPDIR?.trim() || "/tmp";
    return path.join(base, "planetsport-studio", "local");
  }

  return path.join(projectRoot(), "data", "local");
}

export function localJsonStorePath(filename: string): string {
  return path.join(localJsonStoreDir(), filename);
}
