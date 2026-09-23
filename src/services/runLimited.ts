/** Run independent jobs with a small, fixed number of active workers. */
export async function runLimited<T>(items: readonly T[], concurrency: number, task: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (next < items.length) {
      const index = next++;
      await task(items[index], index);
    }
  });
  await Promise.all(workers);
}
