import '@/styles/home.css';
import '@/styles/public-pages.css';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CinematicEffects } from '@/components/layout/cinematic-effects';
import { ImageProtection } from '@/components/layout/image-protection';
import '@/styles/cinematic.css';
import { StudioSchema } from '@/components/seo/studio-schema';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cinematic-site">
      <StudioSchema />
      <CinematicEffects />
      <ImageProtection />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="site-main">
        <div className="route-scene">{children}</div>
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
