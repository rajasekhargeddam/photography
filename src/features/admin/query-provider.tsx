'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { createAdminClient } from './query-cache';
import { usePathname } from 'next/navigation';
export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createAdminClient);
  const path = usePathname();
  useEffect(() => {
    if (path === '/admin/login') client.clear();
  }, [path, client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
