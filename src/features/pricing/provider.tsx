'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicJson } from '@/lib/public-data';
import { pricingSchema, type ServicePrices } from './model';
const PriceContext = createContext<ServicePrices | null>(null);
export function useServicePrices() {
  const prices = useContext(PriceContext);
  if (!prices) throw new Error('Service prices are unavailable.');
  return prices;
}
export function PricingProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ['public-pricing'],
    queryFn: async ({ signal }) =>
      pricingSchema.parse(await fetchPublicJson('/api/pricing', signal)).prices,
  });
  const prices = query.data;
  const error = query.error?.message;
  if (!prices)
    return (
      <section className="section container" aria-live="polite">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="button button--primary"
              onClick={() => void query.refetch()}
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
