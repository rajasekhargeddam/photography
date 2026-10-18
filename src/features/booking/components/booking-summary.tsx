'use client';
import { uiCopy } from '@/config/copy';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { bookingActions as actions } from '../model';
import {
  ceremoniesForEvent,
  ceremonyName,
  isCoupleShoot,
  money,
  quoteItems,
  quoteTotal,
  validateQuote,
} from '../quote';
import { confirmEnquiry, enquiryKey, saveEnquiry } from '../api';
import { getApiError } from '@/lib/api/client';
import { catalogueNotice } from '@/data/catalog';
import Link from 'next/link';
import { QuotePrint, SaveQuotePdf } from './quote-print';
import { QuantityControl } from './quantity-control';

export function BookingSummary() {
  const draft = useAppSelector((s) => s.booking);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const saved = draft.saved;
  const dirty = !!saved && saved.requestKey !== enquiryKey(draft);
  const items = dirty ? quoteItems(draft) : (saved?.items ?? []);
  const total = dirty ? quoteTotal(draft) : (saved?.total ?? 0);
  function edit(question: string) {
    dispatch(actions.setQuestion(question));
    router.push('/book');
  }
  async function submit() {
    if (submitting.current || !draft.session || !saved) return;
    const errors = validateQuote(draft);
    if (Object.keys(errors).length) {
      setError(Object.values(errors)[0]);
      return;
    }
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      if (dirty) {
        const result = await saveEnquiry(draft, draft.session);
        dispatch(actions.enquirySaved(result));
      } else {
        const id = await confirmEnquiry(draft.session, saved.revision);
        dispatch(actions.enquiryConfirmed(id));
        router.replace('/thank-you');
      }
    } catch (e) {
      setError(getApiError(e).message);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  if (!saved || !draft.session)
    return (
      <section className="guided-quote">
        <div className="guided-question">
          <h1>{uiCopy.actions.buildQuote}</h1>
          <p>
            Choose your coverage and save your details to review your quote.
            Refreshing the page clears your draft.
          </p>
          <Link className="guided-primary" href="/book">
            {uiCopy.actions.buildQuote} →
          </Link>
        </div>
      </section>
    );
  return (
    <>
      {!dirty && <QuotePrint details={draft} saved={saved} />}
      <div className="guided-quote">
        <div className="guided-total">
          <span>Your sample quote</span>
          <strong aria-live="polite">{money(total)}</strong>
          <span>{dirty ? 'Unsaved changes' : uiCopy.status.savedQuote}</span>
        </div>
        <section className="guided-question guided-summary">
          <p className="guided-eyebrow">Made around your moments</p>
          <h1>Your photography quote</h1>
          <p className="guided-subtitle">
            Review your choices, adjust quantities and send your request to the
            studio.
          </p>
          <p className="guided-note">{catalogueNotice}</p>
          <fieldset disabled={pending}>
            <div className="guided-summary-heading">
              <h2>
                {draft.eventType === 'Marriage' ? 'Wedding' : draft.eventType}
              </h2>
              <button className="guided-back" onClick={() => edit('event')}>
                Change event
              </button>
            </div>
            {draft.ceremonies.map((c) => {
              const label = ceremonyName(draft.eventType, c.id);
              return (
                <section className="guided-summary-group" key={c.id}>
                  <div className="guided-summary-heading">
                    <h2>{label}</h2>
                    <div>
                      <button
                        className="guided-back"
                        onClick={() => edit(`coverage:${c.id}`)}
                      >
                        Edit {label}
                      </button>
                      {draft.eventType === 'Marriage' && (
                        <button
                          className="guided-back"
                          onClick={() => dispatch(actions.toggleCeremony(c.id))}
                        >
                          Remove {label}
                        </button>
                      )}
                    </div>
                  </div>
                  {isCoupleShoot(draft.eventType, c.id) && (
                    <button
                      className="guided-back"
                      onClick={() => edit(`duration:${c.id}`)}
                    >
                      {c.days} day{c.days > 1 ? 's' : ''} · Change duration
                    </button>
                  )}
                  {items
                    .filter((i) => i.groupId === c.id)
                    .map((i) => {
                      const units = c.quantities[i.serviceId] ?? 1;
                      return (
                        <div className="guided-line" key={i.id}>
                          <div>
                            <strong>{i.name}</strong>
                            <small>
                              {money(i.price)} {i.unit} per unit
                              {isCoupleShoot(draft.eventType, c.id)
                                ? ` · ${c.days} days`
                                : ''}
                            </small>
                          </div>
                          <QuantityControl
                            label={label + ' ' + i.name}
                            value={units}
                            disabled={pending}
                            onChange={(quantity) =>
                              dispatch(
                                actions.setServiceQuantity({
                                  ceremonyId: c.id,
                                  serviceId: i.serviceId,
                                  quantity,
                                }),
                              )
                            }
                          />
                          <strong>{money(i.price * i.quantity)}</strong>
                          <button
                            className="guided-back"
                            aria-label={`Remove ${label} ${i.name}`}
                            onClick={() =>
                              dispatch(
                                actions.toggleService({
                                  ceremonyId: c.id,
                                  serviceId: i.serviceId,
                                }),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  {!c.serviceIds.length && (
                    <p className="booking-errors">
                      Choose coverage using Edit before saving.
                    </p>
                  )}
                </section>
              );
            })}
            <details className="guided-additional">
              <summary>Add more coverage or occasions</summary>
              <div className="guided-add-buttons">
                {ceremoniesForEvent(draft.eventType).map((c) => (
                  <button
                    className="guided-back"
                    key={c.id}
                    onClick={() => {
                      if (!draft.ceremonies.some((s) => s.id === c.id))
                        dispatch(actions.toggleCeremony(c.id));
                      edit(
                        isCoupleShoot(draft.eventType, c.id)
                          ? `duration:${c.id}`
                          : `coverage:${c.id}`,
                      );
                    }}
                  >
                    {draft.ceremonies.some((s) => s.id === c.id)
                      ? 'Edit'
                      : 'Add'}{' '}
                    {c.name} →
                  </button>
                ))}
              </div>
            </details>
            <section className="guided-summary-group">
              <div className="guided-summary-heading">
                <h2>Photo album</h2>
                <button className="guided-back" onClick={() => edit('album')}>
                  Edit album
                </button>
              </div>
              {draft.albumQuantity > 0 ? (
                <>
                  <p className="guided-note">
                    {draft.albumSize.replace('x', ' × ')} · Delivery preference:{' '}
                    {draft.albumDelivery === 'one-month'
                      ? '1 month'
                      : draft.albumDelivery === 'three-month'
                        ? '3 months'
                        : 'Discuss with studio'}
                    . Specifications, timeline and any delivery fee need
                    confirmation.
                  </p>
                  <div className="guided-line">
                    <strong>{draft.albumSize.replace('x', ' × ')} album</strong>
                    <QuantityControl
                      label="album"
                      outputLabel="Album quantity"
                      value={draft.albumQuantity}
                      disabled={pending}
                      onChange={(quantity) =>
                        dispatch(actions.setAlbumQuantity(quantity))
                      }
                    />
                    <strong>
                      {money(
                        items
                          .filter((i) => i.groupId === 'extras')
                          .reduce((sum, i) => sum + i.price * i.quantity, 0),
                      )}
                    </strong>
                    <button
                      className="guided-back"
                      aria-label="Remove album"
                      onClick={() => {
                        dispatch(actions.setAlbumQuantity(0));
                        dispatch(
                          actions.setAlbumPreferences({
                            albumSize: '12x36',
                            albumDelivery: 'discuss',
                          }),
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                </>
              ) : (
                <p className="guided-note">No printed album selected.</p>
              )}
            </section>
            <section className="guided-summary-group">
              <div className="guided-summary-heading">
                <h2>Contact & notes</h2>
              </div>
              <p>
                {draft.name} · +91 {draft.mobile}
              </p>
              <button className="guided-back" onClick={() => edit('contact')}>
                Edit contact
              </button>
              <label htmlFor="quote-notes">
                Anything else we should know? (optional)
              </label>
              <textarea
                id="quote-notes"
                maxLength={1000}
                rows={3}
                value={draft.notes}
                onChange={(e) =>
                  dispatch(actions.setDetails({ notes: e.target.value }))
                }
              />
            </section>
            <div className="guided-final-total">
              <span>
                {dirty
                  ? 'Updated sample quote · save to review'
                  : 'Saved sample quote · INR'}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <p className="guided-note">
              Quantities are service units; the studio will confirm crew and
              deliverables. Travel, tax and delivery charges are excluded from
              this sample calculation.
            </p>
            {error && (
              <p role="alert" className="booking-errors">
                {error}
              </p>
            )}
            <button
              className="guided-primary guided-submit"
              onClick={() => void submit()}
            >
              {pending
                ? dirty
                  ? 'Saving…'
                  : 'Sending…'
                : dirty
                  ? 'Save changes'
                  : uiCopy.actions.sendQuote}
            </button>
            <p className="guided-note" role="status">
              {dirty
                ? 'Save your edits before sending the updated quote.'
                : 'Your details are saved. Sending requests studio follow-up; it does not reserve a date or collect payment.'}
            </p>
            <SaveQuotePdf disabled={dirty || pending} />
            <button
              className="guided-back"
              onClick={() => {
                dispatch(actions.resetBooking());
                router.push('/book');
              }}
            >
              Start fresh
            </button>
          </fieldset>
        </section>
      </div>
    </>
  );
}
