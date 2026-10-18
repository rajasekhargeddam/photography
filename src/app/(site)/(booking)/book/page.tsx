import { uiCopy } from '@/config/copy';
import type { Metadata } from 'next';
import { BookingWizard } from '@/features/booking/components/booking-wizard';
export const metadata: Metadata = { title: uiCopy.actions.buildQuote };
export default function Page() {
  return <BookingWizard />;
}
