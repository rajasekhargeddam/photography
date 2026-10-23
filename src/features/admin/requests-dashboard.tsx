'use client';
import { useState } from 'react';
import { AdminInbox } from './inbox';
import dynamic from 'next/dynamic';

const CallbackList = dynamic(
  () => import('./callback-list').then((module) => module.CallbackList),
  { loading: () => <p role="status">Loading call requests…</p> },
);

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
