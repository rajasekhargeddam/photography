'use client';
import { useState } from 'react';
import { AdminInbox } from './inbox';
import { receivedAt } from './data';
import type { CallbackRequest } from '../contact/model';
import { usePagedFeed } from '@/lib/use-paged-feed';

function CallbackList() {
  const feed = usePagedFeed<CallbackRequest>('/api/admin/callbacks');
  return (
    <section aria-label="Callback requests">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Contact form</p>
          <h1>Callback requests</h1>
          <p className="muted">Customers who asked to speak with the studio.</p>
        </div>
        <button disabled={feed.loading} onClick={() => void feed.reload()}>
          Refresh
        </button>
      </div>
      {feed.error && (
        <p className="error" role="alert">
          {feed.error}
        </p>
      )}
      {feed.loading && <p role="status">Loading…</p>}
      {!feed.loading && !feed.error && !feed.items.length && (
        <p>No callback requests yet.</p>
      )}
      <div className="content-grid">
        {feed.items.map((request) => (
          <article className="content-card" key={request._id}>
            <p className="eyebrow">Callback request</p>
            <h2>{request.name}</h2>
            <a href={`tel:+91${request.mobile}`}>{request.mobile}</a>
            <dl>
              <div>
                <dt>Event</dt>
                <dd>{request.eventType}</dd>
              </div>
              <div>
                <dt>Event date</dt>
                <dd>
                  <time dateTime={request.eventDate}>
                    {new Intl.DateTimeFormat('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${request.eventDate}T00:00:00Z`))}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{receivedAt(request.createdAt)} IST</dd>
              </div>
            </dl>
            {request.notes && <p className="review-text">{request.notes}</p>}
          </article>
        ))}
      </div>
      {feed.more && (
        <button disabled={feed.loading} onClick={() => void feed.loadMore()}>
          Load more
        </button>
      )}
      <p className="footnote">
        Callback requests do not reserve a date or contain a quote.
      </p>
    </section>
  );
}
export function RequestsDashboard() {
  const [section, setSection] = useState<'quotes' | 'callbacks'>('quotes');
  return (
    <>
      <div className="request-switch" role="group" aria-label="Request type">
        <button
          aria-pressed={section === 'quotes'}
          onClick={() => setSection('quotes')}
        >
          Quotes
        </button>
        <button
          aria-pressed={section === 'callbacks'}
          onClick={() => setSection('callbacks')}
        >
          Callback requests
        </button>
      </div>
      {section === 'quotes' ? <AdminInbox /> : <CallbackList />}
    </>
  );
}
