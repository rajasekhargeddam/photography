'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UnknownAction } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { bookingActions as actions, bookingReducer } from '../model';
import { questionsFor, eventCards } from '../questions';
import {
  albumPrice,
  coverageFor,
  ceremonyExtrasFor,
  isCoupleShoot,
  money,
  quoteTotal,
  validateQuote,
} from '../quote';
import { newEnquirySession, saveEnquiry } from '../api';
import { getApiError } from '@/lib/api/client';
import { QuoteCard, ServiceDrawing } from './quote-card';

export function BookingWizard() {
  const draft = useAppSelector((s) => s.booking);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const questions = questionsFor(draft);
  const index = Math.max(
    0,
    questions.findIndex((q) => q.id === draft.questionId),
  );
  const q = questions[index];
  const intro = draft.questionId === 'intro';
  const contact = !intro && q.kind === 'contact';
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest('section')?.scrollIntoView({ block: 'start' });
  }, [draft.questionId]);
  useEffect(() => {
    if (contact) {
      dialog.current?.showModal();
      name.current?.focus();
    } else dialog.current?.close();
  }, [contact]);
  function go(id: string) {
    setErrors([]);
    dispatch(actions.setQuestion(id));
  }
  function advance(action?: UnknownAction) {
    const next = action ? bookingReducer(draft, action) : draft;
    if (action) dispatch(action);
    const sequence = questionsFor(next);
    const position = sequence.findIndex((item) => item.id === q.id);
    go(sequence[position + 1]?.id ?? 'contact');
  }
  function back() {
    go(questions[index - 1]?.id ?? 'intro');
  }
  function include(value: boolean) {
    const id = q.ceremonyId!;
    let next = draft;
    const exists = draft.ceremonies.some((c) => c.id === id);
    if (value !== exists) {
      const a = actions.toggleCeremony(id);
      next = bookingReducer(next, a);
      dispatch(a);
    }
    const sequence = questionsFor(next);
    go(
      sequence[sequence.findIndex((item) => item.id === q.id) + 1]?.id ??
        'contact',
    );
  }
  function next() {
    if (
      q.kind === 'coverage' &&
      !draft.ceremonies
        .find((c) => c.id === q.ceremonyId)
        ?.serviceIds.some((id) =>
          coverageFor(draft.eventType, q.ceremonyId!).some((s) => s.id === id),
        )
    ) {
      setErrors(['Choose at least one coverage service.']);
      return;
    }
    advance();
  }
  async function save() {
    if (saving.current) return;
    const found = Object.values(validateQuote(draft));
    setErrors(found);
    if (found.length) return;
    saving.current = true;
    setPending(true);
    const session = draft.session ?? newEnquirySession();
    dispatch(actions.setSession(session));
    try {
      const saved = await saveEnquiry(draft, session);
      dispatch(actions.enquirySaved(saved));
      if (saved.status === 'CONFIRMED') {
        dispatch(actions.enquiryConfirmed(saved.id));
        router.push('/thank-you');
      } else {
        router.push('/book/summary');
      }
    } catch (e) {
      setErrors([getApiError(e).message]);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  const c = draft.ceremonies.find((c) => c.id === q.ceremonyId);
  return (
    <div className="guided-quote">
      {!intro && (
        <div className="guided-total">
          <span>Your sample quote</span>
          <strong aria-live="polite">{money(quoteTotal(draft))}</strong>
          <progress
            value={index + 1}
            max={draft.eventType ? questions.length : 6}
            aria-label="Quote progress"
          />
        </div>
      )}
      {intro ? (
        <section className="guided-intro">
          <p className="guided-eyebrow">A quote built around you</p>
          <h1>
            Your moments.
            <br />
            Your choices. Your <em>quote.</em>
          </h1>
          <p>
            Choose the occasions and coverage you need. Build a photography and
            video estimate, one question at a time.
          </p>
          <ul>
            <li>✓ Choose what matters</li>
            <li>✓ See your running estimate</li>
            <li>✓ Review before sending</li>
          </ul>
          <button className="guided-primary" onClick={() => go('event')}>
            Let’s build my quote →
          </button>
          <p className="guided-note">
            Development sample prices. Final services, availability and charges
            need studio confirmation.
          </p>
        </section>
      ) : (
        <>
          <section className="guided-question" aria-labelledby="question-title">
            <p className="guided-eyebrow">
              Step {index + 1}
              {draft.eventType ? ` of ${questions.length}` : ''} ·{' '}
              {q.kind.replaceAll('-', ' ')}
            </p>
            <h1 id="question-title" tabIndex={-1} ref={heading}>
              {q.title}
            </h1>
            <p className="guided-subtitle">{q.subtitle}</p>
            {!!errors.length && !contact && (
              <div role="alert" className="booking-errors">
                {errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            )}
            {q.kind === 'event' && (
              <div className="guided-cards">
                {eventCards.map((card) => (
                  <QuoteCard
                    key={card.event}
                    title={card.label}
                    description={card.description}
                    image={card.image}
                    onClick={() => advance(actions.chooseEvent(card.event))}
                  />
                ))}
              </div>
            )}
            {q.kind === 'shoot-type' && (
              <div className="guided-cards guided-two">
                {['Pre-Wedding', 'Post-Wedding'].map((event) => (
                  <QuoteCard
                    key={event}
                    title={event}
                    image={2}
                    description={
                      event === 'Pre-Wedding'
                        ? 'Before your wedding day.'
                        : 'A shoot after your wedding.'
                    }
                    onClick={() => advance(actions.chooseEvent(event))}
                  />
                ))}
              </div>
            )}
            {q.kind === 'other-type' && (
              <div className="guided-cards">
                {['Baby Shoot', 'Corporate', 'Other'].map((event) => (
                  <QuoteCard
                    key={event}
                    title={event === 'Other' ? 'Other event' : event}
                    icon={event === 'Baby Shoot' ? '♡' : '✦'}
                    onClick={() => advance(actions.chooseEvent(event))}
                  />
                ))}
              </div>
            )}
            {q.kind === 'include' && (
              <div className="guided-cards guided-two">
                <QuoteCard
                  title="Yes"
                  description="Include this celebration."
                  icon="✓"
                  onClick={() => include(true)}
                />
                <QuoteCard
                  title="No"
                  description="Continue without this occasion."
                  icon="×"
                  onClick={() => include(false)}
                />
              </div>
            )}
            {q.kind === 'duration' && c && (
              <div className="guided-cards guided-two">
                {[1, 2].map((days) => (
                  <QuoteCard
                    key={days}
                    title={days === 1 ? 'One day' : 'Two days'}
                    description="Hours and deliverables will be confirmed with the studio."
                    icon={days === 1 ? '01' : '02'}
                    selected={c.days === days}
                    onClick={() =>
                      advance(
                        actions.updateCeremony({ id: c.id, changes: { days } }),
                      )
                    }
                  />
                ))}
              </div>
            )}
            {q.kind === 'coverage' && c && (
              <>
                <div className="guided-cards">
                  {coverageFor(draft.eventType, c.id).map((service) => (
                    <QuoteCard
                      key={service.id}
                      title={service.name}
                      description={
                        isCoupleShoot(draft.eventType, c.id)
                          ? 'Sample rate per day'
                          : 'Sample rate per ceremony'
                      }
                      price={`+ ${money(service.price)}`}
                      icon={<ServiceDrawing service={service.id} />}
                      selected={c.serviceIds.includes(service.id)}
                      onClick={() =>
                        dispatch(
                          actions.toggleService({
                            ceremonyId: c.id,
                            serviceId: service.id,
                          }),
                        )
                      }
                    />
                  ))}
                </div>
                {ceremonyExtrasFor(draft.eventType, c.id).length > 0 && (
                  <details className="guided-additional">
                    <summary>More studio options</summary>
                    <div className="guided-cards">
                      {ceremonyExtrasFor(draft.eventType, c.id).map(
                        (service) => (
                          <QuoteCard
                            key={service.id}
                            title={service.name}
                            price={`+ ${money(service.price)}`}
                            selected={c.serviceIds.includes(service.id)}
                            onClick={() =>
                              dispatch(
                                actions.toggleService({
                                  ceremonyId: c.id,
                                  serviceId: service.id,
                                }),
                              )
                            }
                          />
                        ),
                      )}
                    </div>
                  </details>
                )}
              </>
            )}
            {q.kind === 'album' && (
              <div className="guided-cards guided-two">
                <QuoteCard
                  title="Yes"
                  description="Include a printed album."
                  icon="▤"
                  onClick={() =>
                    advance(
                      actions.setAlbumQuantity(
                        Math.max(1, draft.albumQuantity),
                      ),
                    )
                  }
                />
                <QuoteCard
                  title="No"
                  description="No printed album for now."
                  icon="×"
                  onClick={() => {
                    dispatch(
                      actions.setAlbumPreferences({
                        albumSize: '12x36',
                        albumDelivery: 'discuss',
                      }),
                    );
                    advance(actions.setAlbumQuantity(0));
                  }}
                />
              </div>
            )}
            {q.kind === 'album-size' && (
              <div className="guided-cards guided-two">
                {(['12x36', '14x40'] as const).map((size) => (
                  <QuoteCard
                    key={size}
                    title={size.replace('x', ' × ')}
                    description="Sample size · pages and finish to be agreed"
                    price={`+ ${money(albumPrice(size))} per album`}
                    icon="▤"
                    onClick={() =>
                      advance(actions.setAlbumPreferences({ albumSize: size }))
                    }
                  />
                ))}
              </div>
            )}
            {q.kind === 'album-delivery' && (
              <div className="guided-cards guided-two">
                {(['one-month', 'three-month'] as const).map((delivery) => (
                  <QuoteCard
                    key={delivery}
                    title={delivery === 'one-month' ? '1 month' : '3 months'}
                    description="Preferred timeline. Availability and delivery charges to be confirmed."
                    icon="◷"
                    onClick={() =>
                      advance(
                        actions.setAlbumPreferences({
                          albumDelivery: delivery,
                        }),
                      )
                    }
                  />
                ))}
              </div>
            )}
            <div className="guided-navigation">
              <button className="guided-back" onClick={back}>
                ← Back
              </button>
              {q.kind === 'coverage' && (
                <button className="guided-primary" onClick={next}>
                  Next step →
                </button>
              )}
            </div>
            {draft.saved && !contact && (
              <button
                className="guided-back"
                onClick={() => router.push('/book/summary')}
              >
                Return to quote review
              </button>
            )}
            <p className="guided-note">
              Sample rates only. Travel, tax and delivery are not calculated.
            </p>
          </section>
          {contact && (
            <dialog
              ref={dialog}
              className="guided-gate"
              aria-labelledby="contact-title"
              onCancel={(e) => {
                if (pending) e.preventDefault();
                else back();
              }}
            >
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <fieldset disabled={pending}>
                  <p className="guided-eyebrow">Your quote is ready</p>
                  <h2 id="contact-title">Let’s make it yours.</h2>
                  <p>
                    Enter your contact details to save and reveal the full
                    estimate.
                  </p>
                  {!!errors.length && (
                    <div role="alert" className="booking-errors">
                      {errors.map((e) => (
                        <p key={e}>{e}</p>
                      ))}
                    </div>
                  )}
                  <label htmlFor="quote-name">Your name</label>
                  <input
                    ref={name}
                    id="quote-name"
                    autoComplete="name"
                    maxLength={100}
                    required
                    value={draft.name}
                    onChange={(e) =>
                      dispatch(actions.setDetails({ name: e.target.value }))
                    }
                  />
                  <label htmlFor="quote-mobile">Mobile number</label>
                  <div className="guided-mobile">
                    <span>+91</span>
                    <input
                      id="quote-mobile"
                      autoComplete="tel-national"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={draft.mobile}
                      onChange={(e) =>
                        dispatch(actions.setDetails({ mobile: e.target.value }))
                      }
                    />
                  </div>
                  <button type="submit" className="guided-primary">
                    {pending ? 'Saving…' : 'Reveal my quote →'}
                  </button>
                  <p className="guided-note">
                    Continuing saves your enquiry and allows My Dream
                    Photography to contact you, even if you do not confirm the
                    request.
                  </p>
                  <button type="button" className="guided-back" onClick={back}>
                    ← Change my answers
                  </button>
                </fieldset>
              </form>
            </dialog>
          )}
        </>
      )}
    </div>
  );
}
