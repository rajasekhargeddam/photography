'use client';
import { EnquiryList } from './enquiry-list';
import { EnquiryDetail } from './enquiry-detail';
export function AdminInbox({ id }: { id?: string }) {
  return id ? <EnquiryDetail id={id} /> : <EnquiryList />;
}
