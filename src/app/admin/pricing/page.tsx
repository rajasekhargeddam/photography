import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { managementEnabled } from '@/config/app-variant';
import { PricingManager } from '@/features/admin/pricing-manager';
export const metadata: Metadata = { title: 'Service Prices | Studio Admin' };
export default function PricingPage() {
  if (!managementEnabled()) notFound();
  return <PricingManager />;
}
