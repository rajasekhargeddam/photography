'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/lib/store/store';
import { PricingProvider } from '@/features/pricing/provider';

export function BookingProviders({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);

  return (
    <Provider store={store}>
      <PricingProvider>{children}</PricingProvider>
    </Provider>
  );
}
