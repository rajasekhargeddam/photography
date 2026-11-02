import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { managementEnabled } from '@/config/app-variant';
import RequestsLayout from '../requests/layout';
export const dynamic = 'force-dynamic';

export default function ContentLayout({ children }: { children: ReactNode }) {
  if (!managementEnabled()) notFound();
  return <RequestsLayout>{children}</RequestsLayout>;
}
