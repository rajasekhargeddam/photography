import { QueryClient } from '@tanstack/react-query';
import type { Enquiry } from './data';
export const createAdminClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
export function saveReadReceipt(
  client: QueryClient,
  record: Enquiry,
  send: typeof fetch = fetch,
) {
  return client.fetchQuery({
    queryKey: ['read-receipt', record.id, record.revision, record.status],
    staleTime: Infinity,
    gcTime: 300_000,
    queryFn: async () => {
      const response = await send(
        '/api/admin/enquiries/' + encodeURIComponent(record.id) + '/read',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revision: record.revision,
            status: record.status,
          }),
        },
      );
      if (!response.ok) throw new Error('Read receipt unavailable');
      client.setQueriesData<{ pages: Enquiry[][]; pageParams: number[] }>(
        { queryKey: ['enquiries'] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((item) =>
                    item.id === record.id &&
                    item.revision === record.revision &&
                    item.status === record.status
                      ? { ...item, unread: false }
                      : item,
                  ),
                ),
              }
            : old,
      );
      return true;
    },
  });
}
