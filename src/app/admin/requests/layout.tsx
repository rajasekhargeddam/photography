import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/server/admin-session';
import { LogoutButton } from '@/features/admin/logout-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
export const dynamic = 'force-dynamic';
export default async function RequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <a className="skip-link" href="#admin-main">
        Skip to admin content
      </a>
      <header className="site-header">
        <Link href="/admin/requests" className="brand">
          My Dream Photography<small>Studio admin</small>
        </Link>
        <div className="header-actions">
          <Link href="/">View website</Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <nav className="admin-navigation" aria-label="Admin navigation">
        <Link href="/admin/requests">Requests</Link>
        <Link href="/admin/content/hero">Home hero</Link>
        <Link href="/admin/content/gallery">Portfolio</Link>
        <Link href="/admin/content/testimonials">Testimonials</Link>
        <Link href="/admin/content/videos">Films</Link>
      </nav>
      <main id="admin-main" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
