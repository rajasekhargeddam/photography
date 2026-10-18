import '@/styles/home.css';
import '@/styles/public-pages.css';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CinematicEffects } from '@/components/layout/cinematic-effects';
import '@/styles/cinematic.css';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cinematic-site">
      <CinematicEffects />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="site-main">
        <div className="route-scene">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
