'use client';
import { uiCopy } from '@/config/copy';
import { ceremonyName } from '../booking/quote';
import { QuotePrint, SaveQuotePdf } from '../booking/components/quote-print';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import {
  eventDate,
  fetchEnquiries,
  fetchEnquiry,
  groupEnquiries,
  money,
  receivedAt,
  timeOfDay,
  type Enquiry,
} from './data';
function Status({ status }: { status: Enquiry['status'] }) {
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {status === 'CONFIRMED'
        ? uiCopy.status.sentQuote
        : uiCopy.status.savedQuote}
    </span>
  );
}
function ErrorNotice({
  error,
  retry,
  pending,
}: {
  error: Error;
  retry: () => void;
  pending: boolean;
}) {
  return (
    <div className="error" role="alert">
      <p>{error.message}</p>
      <button disabled={pending} onClick={retry}>
        {uiCopy.actions.tryAgain}
      </button>
    </div>
  );
}
function EnquiryList() {
  const query = useInfiniteQuery({
    queryKey: ['enquiries'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => fetchEnquiries(pageParam, signal),
    getNextPageParam: (lastPage, _pages, offset) =>
      lastPage.length === 30 ? offset + 30 : undefined,
  });
  const groups = groupEnquiries(query.data?.pages.flat() ?? []);
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
          <h2>No quote requests yet</h2>
          <p>Requests appear here after visitors complete their details.</p>
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
                <a className="enquiry-row" href={`/admin/requests/${item.id}`}>
                  <div className="row-client">
                    <span className="avatar" aria-hidden="true">
                      {item.details.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{item.details.name}</strong>
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
                      {item.details.ceremonies
                        ? `${item.details.ceremonies.length} ceremony / shoot${item.details.ceremonies.some((c) => c.dateUndecided) ? ' · dates to discuss' : ''}`
                        : eventDate(item.details.eventDate)}
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
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
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
function EnquiryDetail({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['enquiry', id],
    queryFn: ({ signal }) => fetchEnquiry(id, signal),
  });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [id, query.isSuccess]);
  const record = query.data;
  return (
    <>
      {record && (
        <QuotePrint
          details={record.details}
          saved={{
            status: record.status,
            total: record.details.total,
            items: record.details.items,
          }}
        />
      )}
      <Link className="back-link" href="/admin/requests">
        ← All quote requests
      </Link>
      {query.isPending && (
        <p role="status" className="empty">
          Loading quote request…
        </p>
      )}
      {query.isError && (
        <ErrorNotice
          error={query.error}
          pending={query.isFetching}
          retry={() => void query.refetch()}
        />
      )}
      {record && (
        <>
          <div className="page-heading detail-heading">
            <div>
              <p className="eyebrow">Quote request details</p>
              <h1 ref={heading} tabIndex={-1}>
                {record.details.name}
              </h1>
              <p className="muted">
                Received {receivedAt(record.createdAt)} IST
              </p>
            </div>
            <Status status={record.status} />
          </div>
          <div className="detail-grid">
            <section className="panel contact-panel">
              <p className="eyebrow">Contact</p>
              <h2>Start the conversation</h2>
              <a className="phone" href={`tel:${record.details.mobile}`}>
                {record.details.mobile}
              </a>
              <a
                className="primary-button"
                href={`tel:${record.details.mobile}`}
              >
                Call client ↗
              </a>
              <p className="muted">
                {record.status === 'ATTEMPTED'
                  ? 'Details saved. The client has not sent the quote yet.'
                  : 'Discuss requirements, availability and payment.'}
              </p>
            </section>
            <section className="panel">
              <p className="eyebrow">Event</p>
              <h2>
                {record.details.eventType === 'Marriage'
                  ? 'Wedding'
                  : record.details.eventType}
              </h2>
              <dl>
                <div>
                  <dt>
                    {record.details.ceremonies ? 'First known date' : 'Date'}
                  </dt>
                  <dd>{eventDate(record.details.eventDate)}</dd>
                </div>
                <div>
                  <dt>Place</dt>
                  <dd>{record.details.location || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Selection</dt>
                  <dd>
                    {record.details.bookingType === 'PACKAGE'
                      ? 'Package'
                      : 'Custom services'}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="panel selection-panel">
              <p className="eyebrow">Saved selection</p>
              <h2>
                {record.details.bookingType === 'PACKAGE'
                  ? 'Package details'
                  : 'Custom services'}
              </h2>
              {record.details.ceremonies?.map((c) => (
                <div className="ceremony-record" key={c.id}>
                  <h3>
                    {record.details.items.find((i) => i.groupId === c.id)
                      ?.groupName ??
                      ceremonyName(record.details.eventType, c.id)}
                  </h3>
                  <p>
                    {eventDate(c.date)} · {c.location || 'Place not provided'} ·{' '}
                    {c.days} day{c.days > 1 ? 's' : ''}
                  </p>
                  <p>
                    Saved subtotal:{' '}
                    {money(
                      record.details.items
                        .filter((i) => i.groupId === c.id)
                        .reduce((sum, i) => sum + i.price * i.quantity, 0),
                    )}
                  </p>
                </div>
              ))}
              <ul className="items">
                {record.details.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.groupName ? `${item.groupName} · ` : ''}
                      {item.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      {item.unit ? ` · ${item.unit}` : ''}
                    </span>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              {!!record.details.albumQuantity && (
                <p className="muted">
                  Album size:{' '}
                  {record.details.albumSize?.replace('x', ' × ') ?? 'Discuss'} ·
                  Requested delivery:{' '}
                  {record.details.albumDelivery === 'one-month'
                    ? '1 month'
                    : record.details.albumDelivery === 'three-month'
                      ? '3 months'
                      : 'Discuss with client'}
                  . Timeline and delivery fee are unconfirmed.
                </p>
              )}
              <div className="total">
                <span>
                  {record.details.pricingStatus === 'DEVELOPMENT_SAMPLE'
                    ? 'Development sample quote · INR'
                    : 'Saved quote · INR'}
                </span>
                <strong>{money(record.details.total)}</strong>
              </div>
            </section>
            {record.details.notes && (
              <section className="panel">
                <h2>Client notes</h2>
                <p className="client-notes">{record.details.notes}</p>
              </section>
            )}
            <section className="panel record-panel">
              <p className="eyebrow">Request record</p>
              <h2>Request history</h2>
              <dl>
                <div>
                  <dt>Last updated</dt>
                  <dd>{receivedAt(record.updatedAt)} IST</dd>
                </div>
                {record.confirmedAt && (
                  <div>
                    <dt>Sent to studio</dt>
                    <dd>{receivedAt(record.confirmedAt)} IST</dd>
                  </div>
                )}
              </dl>
              <SaveQuotePdf disabled={query.isFetching} />
              <button
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                {query.isFetching ? 'Refreshing…' : 'Refresh details'}
              </button>
            </section>
          </div>
          <p className="footnote">
            A quote sent to the studio does not reserve a date or record
            payment.
          </p>
        </>
      )}
    </>
  );
}
export function AdminInbox({ id }: { id?: string }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {id ? <EnquiryDetail id={id} /> : <EnquiryList />}
    </QueryClientProvider>
  );
}
