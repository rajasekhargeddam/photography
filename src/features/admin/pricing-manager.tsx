'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, getApiError } from '@/lib/api/client';
import {
  priceFields,
  pricingSchema,
  pricesSchema,
  type Pricing,
} from '@/features/pricing/model';

export function PricingManager() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get('admin/pricing', { signal: controller.signal })
      .then(({ data }) => {
        const loaded = pricingSchema.parse(data);
        setPricing(loaded);
        setValues(
          Object.fromEntries(
            Object.entries(loaded.prices).map(([id, price]) => [
              id,
              String(price),
            ]),
          ),
        );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(getApiError(error).message);
      });
    return () => controller.abort();
  }, [attempt]);
  const changed = priceFields.filter(
    ({ id }) =>
      pricing &&
      (values[id]?.trim() === '' || Number(values[id]) !== pricing.prices[id]),
  );
  const dirty = changed.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pricing || busy) return;
    const result = pricesSchema.safeParse(
      Object.fromEntries(
        priceFields.map(({ id }) => [
          id,
          values[id]?.trim() ? Number(values[id]) : NaN,
        ]),
      ),
    );
    if (!result.success) {
      setError(
        'Enter whole-rupee prices between ₹0 and ₹10,00,000 for every row.',
      );
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiClient.put('admin/pricing', {
        prices: result.data,
        revision: pricing.revision,
      });
      setPricing(pricingSchema.parse(response.data));
      setMessage(
        'Prices saved. New quotes will use these rates. Existing saved quotes keep their recorded prices.',
      );
    } catch (error) {
      setError(getApiError(error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pricing-manager">
      <p className="eyebrow">Studio settings</p>
      <h1>Service Prices</h1>
      <p>
        Set your coverage and album rates in Indian rupees. Coverage is charged
        per selected unit, per ceremony or shoot day.
      </p>
      <p>
        Updates apply when a new quote is saved or an existing quote is edited.
        Confirmed quotes remain unchanged.
      </p>
      {error && (
        <p role="alert" className="pricing-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="pricing-success">
          {message}
        </p>
      )}
      {!pricing ? (
        <div>
          <p>{error ? 'Could not load prices.' : 'Loading prices…'}</p>
          {error && (
            <button
              className="button button--outline"
              onClick={() => {
                setError('');
                setAttempt((a) => a + 1);
              }}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={busy}>
            <legend className="sr-only">Service rates</legend>
            {[
              { title: 'Photography', ids: ['traditional-photo', 'candid'] },
              {
                title: 'Video & aerial coverage',
                ids: [
                  'traditional-video',
                  'cinematic',
                  'drone',
                  'audience-video',
                ],
              },
              { title: 'Albums', ids: ['album', 'album-large'] },
            ].map((group) => (
              <section className="pricing-group" key={group.title}>
                <h2>{group.title}</h2>
                {priceFields
                  .filter((service) => group.ids.includes(service.id))
                  .map((service) => (
                    <label
                      className={`pricing-row${changed.some((field) => field.id === service.id) ? ' is-dirty' : ''}`}
                      key={service.id}
                    >
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.unit}</small>
                      </span>
                      <span className="pricing-input">
                        <span aria-hidden="true">₹</span>
                        <input
                          aria-label={`${service.name} price in rupees`}
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          required
                          value={values[service.id] ?? ''}
                          onChange={(e) => {
                            setValues({
                              ...values,
                              [service.id]: e.target.value,
                            });
                            setMessage('');
                          }}
                        />
                      </span>
                    </label>
                  ))}
              </section>
            ))}
            <div className="pricing-actions">
              <p role="status">
                {dirty
                  ? `${changed.length} unsaved change${changed.length === 1 ? '' : 's'}`
                  : 'All prices saved'}
              </p>
              <button
                className="button button--primary"
                type="submit"
                disabled={!dirty || busy}
              >
                {busy ? 'Saving…' : 'Save prices'}
              </button>
              <button
                type="button"
                className="button button--outline"
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(
                      'Discard unsaved price changes and reload saved prices?',
                    )
                  )
                    return;
                  setPricing(null);
                  setError('');
                  setMessage('');
                  setAttempt((a) => a + 1);
                }}
              >
                Reload saved prices
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
