'use client';
import { useState } from 'react';
import { AdminInbox } from './inbox';
import { groupByReceivedDay, receivedAt } from './data';
import type { CallbackRequest } from '../contact/model';
import { usePagedFeed } from '@/lib/use-paged-feed';

function CallbackList() {
  const feed = usePagedFeed<CallbackRequest>('/api/admin/callbacks');
  const groups = groupByReceivedDay(feed.items, (request) => request._id);
  return (
    <section aria-label="Call requests">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Contact form</p>
          <h1>Call requests</h1>
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
        <p>No call requests yet.</p>
      )}
      <div className="list-caption">
        <span>Newest first</span>
        <span>Received time · India</span>
      </div>
      {groups.map((group) => (
        <section
          key={group.key}
          className="day-group"
          aria-labelledby={`calls-day-${group.key}`}
        >
          <h2 id={`calls-day-${group.key}`} className="group-heading">
            {group.label}
            <span>{group.records.length}</span>
          </h2>
          <div className="callback-rows">
            {group.records.map((request) => (
              <article className="callback-row" key={request._id}>
                <div className="callback-client">
                  <h3>{request.name}</h3>
                  <a href={`tel:+91${request.mobile}`}>{request.mobile}</a>
                </div>
                <div>
                  <span className="callback-label">Event</span>
                  <strong>{request.eventType}</strong>
                </div>
                <div>
                  <span className="callback-label">Event date</span>
                  <time dateTime={request.eventDate}>
                    {new Intl.DateTimeFormat('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${request.eventDate}T00:00:00Z`))}
                  </time>
                </div>
                <div>
                  <span className="callback-label">Received · IST</span>
                  <time dateTime={request.createdAt}>
                    {receivedAt(request.createdAt)}
                  </time>
                </div>
                {request.notes && (
                  <details className="callback-notes">
                    <summary>Client notes</summary>
                    <p className="review-text">{request.notes}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {feed.more && (
        <button disabled={feed.loading} onClick={() => void feed.loadMore()}>
          Load more call requests
        </button>
      )}
      <p className="footnote">
        Call requests do not reserve a date or contain a quote.
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
          Quote requests
        </button>
        <button
          aria-pressed={section === 'callbacks'}
          onClick={() => setSection('callbacks')}
        >
          Call requests
        </button>
      </div>
      {section === 'quotes' ? <AdminInbox /> : <CallbackList />}
    </>
  );
}
