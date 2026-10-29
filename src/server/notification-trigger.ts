/** Customer submissions trigger delivery; the hosted scheduler handles retries. */
export function createNotificationTrigger() {
  return (method: string, path: string, ok: boolean) =>
    ok &&
    method === 'POST' &&
    (path === '/api/callbacks' ||
      /^\/api\/enquiries\/[\w-]+\/confirm$/.test(path));
}
