/** Runs unfinished entries with bounded concurrency; successful entries are never repeated. */
export async function runUploadQueue<T>(
  entries: T[],
  shouldRun: (entry: T) => boolean,
  upload: (entry: T) => Promise<void>,
  signal: AbortSignal,
  concurrency = 2,
) {
  const pending = entries.filter(shouldRun);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
      while (!signal.aborted && index < pending.length) {
        const entry = pending[index++];
        await upload(entry);
      }
    }),
  );
}
