'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, getApiError } from '@/lib/api/client';
import { pricingSchema, type ServicePrices } from './model';
const PriceContext = createContext<ServicePrices | null>(null);
export function useServicePrices() {
  const prices = useContext(PriceContext);
  if (!prices) throw new Error('Service prices are unavailable.');
  return prices;
}
export function PricingProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<ServicePrices | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get('pricing', { signal: controller.signal })
      .then(({ data }) => {
        setPrices(pricingSchema.parse(data).prices);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(getApiError(error).message);
      });
    return () => controller.abort();
  }, [attempt]);
  if (!prices)
    return (
      <section className="section container" aria-live="polite">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="button button--primary"
              onClick={() => {
                setError('');
                setAttempt((value) => value + 1);
              }}
            >
              Retry loading prices
            </button>
          </>
        ) : (
          <p>Loading current service prices…</p>
        )}
      </section>
    );
  return (
    <PriceContext.Provider value={prices}>{children}</PriceContext.Provider>
  );
}
