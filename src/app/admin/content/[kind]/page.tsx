import { notFound } from 'next/navigation';
import { managementEnabled } from '@/config/app-variant';
import { ContentManager } from '@/features/admin/content-manager';
import { contentKinds, type ContentKind } from '@/features/content/model';

export default async function ContentPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  if (!managementEnabled()) notFound();
  const { kind } = await params;
  if (!contentKinds.includes(kind as ContentKind)) notFound();
  return <ContentManager key={kind} kind={kind as ContentKind} />;
}
