'use client';
import { Icon } from '@/components/ui/icon';
import { uiCopy } from '@/config/copy';
import { useRef, useState, type FormEvent } from 'react';
import { callbackInput } from './model';
import { categories } from '../content/model';
import { indiaToday } from '../booking/quote';

export function CallbackForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const pending = useRef(false);
  const attempt = useRef<{ id: string; body: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const body = JSON.stringify(fields);
    if (attempt.current?.body !== body)
      attempt.current = { id: crypto.randomUUID(), body };
    const parsed = callbackInput.safeParse({
      ...fields,
      requestId: attempt.current.id,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/callbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.message ?? 'Unable to send your request. Please try again.',
        );
      }
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof TypeError
          ? 'Connection interrupted. Please try again; your details are still here.'
          : (cause as Error).message,
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="callback-success" role="status">
        <h3>Your call request has been sent.</h3>
        <p>
          Our studio will contact you about your event. Your date is not
          reserved until confirmed with the studio.
        </p>
      </div>
    );
  return (
    <form className="callback-form" onSubmit={submit}>
      <p>Leave your details and we’ll call you to discuss your celebration.</p>
      <fieldset disabled={busy}>
        <label>
          Name{' '}
          <input name="name" autoComplete="name" maxLength={100} required />
        </label>
        <label>
          Mobile number{' '}
          <input
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="10-digit mobile number"
            required
          />
        </label>
        <label>
          Event date{' '}
          <input name="eventDate" type="date" min={indiaToday()} required />
        </label>
        <label>
          Event type{' '}
          <select name="eventType" defaultValue="" required>
            <option value="" disabled>
              Select your event
            </option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Anything you’d like us to know?{' '}
          <span className="optional-field">Optional</span>
          <textarea
            name="notes"
            rows={4}
            maxLength={1000}
            placeholder="Tell us a little about your plans…"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button--primary">
          <Icon name="phone" />
          {busy ? 'Sending…' : uiCopy.actions.requestCall}
        </button>
      </fieldset>
      <p className="callback-note">
        We’ll use these details to respond to your request. Sending this form
        does not reserve your date.
      </p>
    </form>
  );
}
