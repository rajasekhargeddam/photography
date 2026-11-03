'use client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  eventDate,
  fetchEnquiries,
  groupEnquiries,
  money,
  timeOfDay,
  type Enquiry,
} from './data';
import { QuoteDrawer } from './enquiry-detail';
import { ErrorNotice, Status } from './inbox-notices';
export function EnquiryList() {
  const client = useQueryClient();
  const [filter, setFilter] = useState<Enquiry['status'] | 'ALL' | 'UNREAD'>(
    'CONFIRMED',
  );
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [opened, setOpened] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ['enquiries', filter, term],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const records = await fetchEnquiries(
        pageParam,
        signal,
        filter === 'ALL' || filter === 'UNREAD' ? undefined : filter,
        term,
        filter === 'UNREAD',
      );
      for (const record of records)
        client.setQueryData(['enquiry', record.id], record);
      return records;
    },
    getNextPageParam: (lastPage, _pages, offset) =>
      lastPage.length === 30 ? offset + 30 : undefined,
  });
  const groups = groupEnquiries(
    (query.data?.pages.flat() ?? []).filter(
      (item) => filter !== 'UNREAD' || item.unread !== false,
    ),
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Studio inbox</p>
          <h1 ref={heading} tabIndex={-1}>
            Quote requests
          </h1>
          <p className="muted">Your next conversation starts here.</p>
        </div>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <label className="inbox-search">
        <span>Find a quote</span>
        <input
          type="search"
          placeholder="Search customer name or phone number"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div
        className="request-switch"
        role="group"
        aria-label="Quote request status"
      >
        {(
          [
            ['CONFIRMED', 'Sent to studio'],
            ['UNREAD', 'Unread'],
            ['ATTEMPTED', 'Saved quotes'],
            ['ALL', 'All quotes'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="list-caption">
        <span>Newest first</span>
        <span>Received time · India</span>
      </div>
      {query.isPending && (
        <p role="status" className="empty">
          Loading quote requests…
        </p>
      )}
      {query.isError && (
        <ErrorNotice
          error={query.error}
          pending={query.isFetching}
          retry={() => {
            if (query.isFetchNextPageError) void query.fetchNextPage();
            else void query.refetch();
          }}
        />
      )}
      {query.isSuccess && !groups.length && (
        <div className="empty">
          <span className="empty-symbol" aria-hidden="true">
            ↗
          </span>
          <h2>
            {term || filter === 'UNREAD'
              ? 'No matching quotes'
              : filter === 'CONFIRMED'
                ? 'No quotes sent to the studio yet'
                : filter === 'ATTEMPTED'
                  ? 'No saved quotes awaiting submission'
                  : 'No quote requests yet'}
          </h2>
          <p>
            {term || filter === 'UNREAD'
              ? 'Try another search or filter.'
              : filter === 'CONFIRMED'
                ? 'Quotes appear here when a client sends them to the studio.'
                : filter === 'ATTEMPTED'
                  ? 'Quotes saved without sending appear here.'
                  : 'Requests appear here after visitors complete their details.'}
          </p>
          <a href="/book" target="_blank" rel="noreferrer">
            Open booking page ↗
          </a>
        </div>
      )}
      {groups.map((group) => (
        <section
          key={group.key}
          className="day-group"
          aria-labelledby={`day-${group.key}`}
        >
          <h2 id={`day-${group.key}`} className="group-heading">
            {group.label}
            <span>{group.enquiries.length}</span>
          </h2>
          <ul className="enquiries">
            {group.enquiries.map((item) => (
              <li key={item.id}>
                <Link
                  prefetch={false}
                  className={`enquiry-row${item.unread ? ' enquiry-row--unread' : ''}`}
                  href={`/admin/requests/${item.id}`}
                  onClick={(event) => {
                    if (
                      !event.ctrlKey &&
                      !event.metaKey &&
                      !event.shiftKey &&
                      !event.altKey &&
                      window.matchMedia('(min-width: 1100px)').matches
                    ) {
                      event.preventDefault();
                      setOpened(item.id);
                    }
                  }}
                >
                  <div className="row-client">
                    <span className="avatar" aria-hidden="true">
                      {item.details.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{item.details.name}</strong>
                      {item.unread && (
                        <span className="quote-unread-badge">Unread</span>
                      )}
                      <span className="muted">{item.details.mobile}</span>
                    </div>
                  </div>
                  <div className="row-event">
                    <strong>
                      {item.details.eventType === 'Marriage'
                        ? 'Wedding'
                        : item.details.eventType}
                    </strong>
                    <span className="muted">
                      {eventDate(item.details.eventDate)}
                      {item.details.ceremonies
                        ? ` · ${item.details.ceremonies.length} ceremony / shoot${item.details.ceremonies.some((c) => c.dateUndecided) ? ' · dates to discuss' : ''}`
                        : ''}
                    </span>
                  </div>
                  <div className="row-selection">
                    <span>
                      {item.details.bookingType === 'PACKAGE'
                        ? item.details.items[0]?.name
                        : 'Custom services'}
                    </span>
                    <span className="muted">{money(item.details.total)}</span>
                  </div>
                  <Status status={item.status} />
                  <time className="row-time" dateTime={item.createdAt}>
                    {timeOfDay(item.createdAt)}
                  </time>
                  <span className="row-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {opened && (
        <QuoteDrawer
          id={opened}
          onClose={() => {
            setOpened(null);
          }}
        />
      )}
      {query.hasNextPage && (
        <div className="load-more">
          <button
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more quote requests'}
          </button>
        </div>
      )}
      {!!groups.length && (
        <p className="footnote">
          Saved quote = details saved. Sent to studio = client requested
          follow-up.
        </p>
      )}
    </>
  );
}
