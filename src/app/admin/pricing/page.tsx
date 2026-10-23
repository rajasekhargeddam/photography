import type { Metadata } from 'next';
import { PricingManager } from '@/features/admin/pricing-manager';
export const metadata: Metadata = { title: 'Service Prices | Studio Admin' };
export default function PricingPage() {
  return <PricingManager />;
}
