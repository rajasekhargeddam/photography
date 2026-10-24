import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/admin.css';
import '@/styles/quote-print.css';
import '@/styles/admin-workspace.css';
export const metadata: Metadata = {
  title: 'Studio admin',
  robots: { index: false, follow: false },
};
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-surface">{children}</div>;
}
