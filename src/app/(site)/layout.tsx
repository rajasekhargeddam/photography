import '@/styles/home.css';
import '@/styles/public-pages.css';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="site-main">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
