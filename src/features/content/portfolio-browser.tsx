'use client';
import { useEffect, useRef, useState } from 'react';
import { PublicGallery, PublicVideos } from './public-content';

type Tab = 'pictures' | 'films';
export function PortfolioBrowser() {
  const [tab, setTab] = useState<Tab>('pictures');
  const [filmsVisited, setFilmsVisited] = useState(false);
  const [ready, setReady] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const positions = useRef<Partial<Record<Tab, number>>>({});
  const current = useRef<Tab>('pictures');
  function select(next: Tab, updateHash = true) {
    if (current.current === next) return;
    positions.current[current.current] = window.scrollY;
    current.current = next;
    if (next === 'films') setFilmsVisited(true);
    setTab(next);
    if (updateHash)
      window.history.replaceState(
        null,
        '',
        next === 'films' ? '#videos' : '#pictures',
      );
    requestAnimationFrame(() => {
      const top = tabs.current?.parentElement
        ? tabs.current.parentElement.getBoundingClientRect().top +
          window.scrollY -
          16
        : 0;
      window.scrollTo({
        top: positions.current[next] ?? Math.max(0, top),
        behavior: 'instant',
      });
    });
  }
  useEffect(() => {
    const hashChanged = () => {
      if (window.location.hash === '#videos') select('films', false);
      else if (window.location.hash === '#pictures') select('pictures', false);
      setReady(true);
    };
    hashChanged();
    window.addEventListener('hashchange', hashChanged);
    return () => window.removeEventListener('hashchange', hashChanged);
  }, []);
  return (
    <div className="portfolio-browser">
      <div
        className="portfolio-tabs"
        ref={tabs}
        role="tablist"
        aria-label="Portfolio collection"
      >
        {(['pictures', 'films'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`portfolio-tab-${value}`}
            aria-controls={`portfolio-panel-${value}`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => select(value)}
            onKeyDown={(event) => {
              if (
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 'pictures'
                  : event.key === 'End'
                    ? 'films'
                    : value === 'pictures'
                      ? 'films'
                      : 'pictures';
              select(next);
              document
                .getElementById(`portfolio-tab-${next}`)
                ?.focus({ preventScroll: true });
            }}
          >
            <span aria-hidden="true">{value === 'pictures' ? '▦' : '▷'}</span>
            {value === 'pictures' ? 'Pictures' : 'Films'}
          </button>
        ))}
      </div>
      <div
        id="portfolio-panel-pictures"
        role="tabpanel"
        aria-labelledby="portfolio-tab-pictures"
        hidden={tab !== 'pictures'}
        tabIndex={0}
      >
        {ready && <PublicGallery active={tab === 'pictures'} />}
      </div>
      <div
        id="portfolio-panel-films"
        role="tabpanel"
        aria-labelledby="portfolio-tab-films"
        hidden={tab !== 'films'}
        tabIndex={0}
      >
        {filmsVisited && (
          <>
            <div className="home-section-top">
              <h2 className="section-heading">Films</h2>
              <p>Celebrations, in motion.</p>
            </div>
            <PublicVideos active={tab === 'films'} />
          </>
        )}
      </div>
    </div>
  );
}
