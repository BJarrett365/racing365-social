/**
 * Run async work over `items` with at most `concurrency` in flight at once.
 * Preserves result order (same index as `items`).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function poolWorker(): Promise<void> {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  const pool = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: pool }, () => poolWorker()));
  return results;
}
