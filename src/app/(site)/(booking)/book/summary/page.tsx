import { uiCopy } from '@/config/copy';
import type { Metadata } from 'next';
import { BookingSummary } from '@/features/booking/components/booking-summary';
export const metadata: Metadata = { title: uiCopy.actions.reviewQuote };
export default function Page() {
  return <BookingSummary />;
}
