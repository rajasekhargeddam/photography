/** Avoid repeated reconciliation during admin browsing and batch uploads.
 * This is a per-instance optimization; durable delivery locking stays in MongoDB.
 */
export function createNotificationTrigger(now = Date.now) {
  let nextAdminCheck = 0;
  return (method: string, path: string, ok: boolean) => {
    if (!ok) return false;
    if (
      method === 'POST' &&
      (path === '/api/callbacks' ||
        /^\/api\/enquiries\/[\w-]+\/confirm$/.test(path))
    )
      return true;
    if (!path.startsWith('/api/admin/')) return false;
    const time = now();
    if (time < nextAdminCheck) return false;
    nextAdminCheck = time + 60_000;
    return true;
  };
}
