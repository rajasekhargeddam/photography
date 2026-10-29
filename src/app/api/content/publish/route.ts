import { withDatabase } from '@/server/database';
import { publishContent } from '@/server/content-publication';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return publishContent(request, () =>
    withDatabase(async (getDatabase) =>
      (await getDatabase()).publication.publish(),
    ),
  );
}
