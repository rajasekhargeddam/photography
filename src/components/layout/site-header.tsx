'use client';
import { uiCopy } from '@/config/copy';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { navigation } from '@/config/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
export function SiteHeader() {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const query = window.matchMedia('(min-width: 1200px)');
    const closeOnDesktop = () => {
      if (query.matches) dialog.current?.close();
    };
    query.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previous;
      query.removeEventListener('change', closeOnDesktop);
    };
  }, [open]);
  const links = (mobile = false) =>
    navigation.map(({ label, href }) => (
      <Link
        key={href}
        href={href}
        aria-current={path === href ? 'page' : undefined}
        onClick={mobile ? () => dialog.current?.close() : undefined}
      >
        {label}
      </Link>
    ));
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner container">
          <Brand showLocation={false} />
          <nav className="desktop-nav" aria-label="Main navigation">
            {links()}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <ButtonLink href="/book" className="header-cta">
              {uiCopy.actions.buildQuote}
            </ButtonLink>
            <button
              className="icon-button menu-trigger"
              type="button"
              aria-label="Open navigation"
              aria-controls="mobile-navigation"
              aria-expanded={open}
              onClick={() => {
                dialog.current?.showModal();
                setOpen(true);
              }}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <dialog
        id="mobile-navigation"
        className="mobile-menu"
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="navigation-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="mobile-menu-inner">
          <div className="mobile-menu-top">
            <p id="navigation-title" className="eyebrow">
              Explore the studio
            </p>
            <button
              className="icon-button"
              type="button"
              aria-label="Close navigation"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="Mobile navigation">{links(true)}</nav>
          <ButtonLink href="/book" onClick={() => dialog.current?.close()}>
            {uiCopy.actions.buildQuote} <Icon name="arrow" />
          </ButtonLink>
          <p className="mobile-menu-location">
            Narsipatnam · Visakhapatnam (Vizag)
          </p>
        </div>
      </dialog>
    </>
  );
}
