'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LogoutButton } from './logout-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const links = [
  ['/admin/requests', 'Quote requests', 'Enquiries'],
  ['/admin/callbacks', 'Call requests', 'Enquiries'],
  ['/admin/content/gallery', 'Portfolio', 'Content'],
  ['/admin/content/hero', 'Home images', 'Content'],
  ['/admin/content/videos', 'Films', 'Content'],
  ['/admin/content/testimonials', 'Testimonials', 'Content'],
  ['/admin/pricing', 'Pricing', 'Settings'],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-workspace">
      <a className="skip-link" href="#admin-main">
        Skip to admin content
      </a>
      <header className="workspace-mobile-header">
        <Link href="/admin/requests">
          My Dream <span>Studio</span>
        </Link>
        <button
          aria-expanded={open}
          aria-controls="studio-sidebar"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close menu' : 'Menu'}
        </button>
      </header>
      <aside
        id="studio-sidebar"
        className={`workspace-sidebar${open ? ' is-open' : ''}`}
      >
        <Link
          href="/admin/requests"
          className="workspace-brand"
          onClick={() => setOpen(false)}
        >
          <span className="workspace-monogram">MD</span>
          <span>
            My Dream<small>Studio workspace</small>
          </span>
        </Link>
        <nav aria-label="Studio navigation">
          {['Enquiries', 'Content', 'Settings'].map((group) => (
            <div className="workspace-nav-group" key={group}>
              <p>{group}</p>
              {links
                .filter((link) => link[2] === group)
                .map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    aria-current={
                      pathname === href || pathname.startsWith(href + '/')
                        ? 'page'
                        : undefined
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className="workspace-nav-dot" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="workspace-sidebar-footer">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            View website ↗
          </Link>
          <div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main id="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
