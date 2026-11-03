'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { QuotePrint, SaveQuotePdf } from '../booking/components/quote-print';
import { ceremonyName } from '../booking/quote';
import { eventDate, fetchEnquiry, money, receivedAt } from './data';
import { ErrorNotice, Status } from './inbox-notices';
import { saveReadReceipt } from './query-cache';
export function QuoteDrawer({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="quote-drawer"
      aria-label="Quote request details"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="quote-drawer-toolbar">
        <Link prefetch={false} href={`/admin/requests/${id}`}>
          Open full page ↗
        </Link>
        <button autoFocus onClick={onClose} aria-label="Close quote details">
          Close ✕
        </button>
      </div>
      <EnquiryDetail id={id} compact />
    </dialog>
  );
}
export function EnquiryDetail({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['enquiry', id],
    queryFn: ({ signal }) => fetchEnquiry(id, signal),
  });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [id, query.isSuccess]);
  const record = query.data;
  const [readError, setReadError] = useState(false);
  const [readRetry, setReadRetry] = useState(0);
  useEffect(() => {
    if (!record || record.unread === false) return;
    let active = true;
    void saveReadReceipt(client, record)
      .then(() => {
        if (active) setReadError(false);
      })
      .catch(() => {
        if (active) setReadError(true);
      });
    return () => {
      active = false;
    };
  }, [id, record, readRetry, client]);
  return (
    <>
      {readError && (
        <p role="status">
          Could not save read status.{' '}
          <button onClick={() => setReadRetry((value) => value + 1)}>
            Retry
          </button>
        </p>
      )}
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
      {!compact && (
        <Link className="back-link" href="/admin/requests">
          ← All quote requests
        </Link>
      )}
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
          <div className="quote-quick-actions">
            <a
              className="primary-button"
              href={`tel:+91${record.details.mobile}`}
            >
              Call client
            </a>
            <a
              className="primary-button"
              href={`https://wa.me/91${record.details.mobile}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp ↗
            </a>
            <SaveQuotePdf disabled={query.isFetching} />
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
