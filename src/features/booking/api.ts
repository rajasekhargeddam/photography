import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { canonicalQuantities } from './quote';
import type { BookingDraft, EnquirySession, SavedEnquiry } from './model';

function enquiryPayload(draft: BookingDraft) {
  return {
    quoteVersion: 2 as const,
    eventType: draft.eventType,
    ceremonies: [...draft.ceremonies]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        ...c,
        location: c.location.trim(),
        serviceIds: [...c.serviceIds].sort(),
        quantities: canonicalQuantities(c.quantities),
      })),
    albumQuantity: draft.albumQuantity,
    albumSize: draft.albumSize,
    albumDelivery: draft.albumDelivery,
    name: draft.name.trim(),
    mobile: draft.mobile,
    notes: draft.notes.trim(),
  };
}
export const enquiryKey = (draft: BookingDraft) =>
  JSON.stringify(enquiryPayload(draft));
export function newEnquirySession(): EnquirySession {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    id: crypto.randomUUID(),
    token: [...bytes]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(''),
  };
}
const responseSchema = z.object({
  id: z.uuid(),
  revision: z.uuid(),
  status: z.enum(['ATTEMPTED', 'CONFIRMED']),
  details: z.object({
    total: z.number().nonnegative(),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        unit: z.string(),
        serviceId: z.string(),
        groupId: z.string(),
        groupName: z.string(),
      }),
    ),
  }),
});
export async function saveEnquiry(
  draft: BookingDraft,
  session: EnquirySession,
): Promise<SavedEnquiry> {
  const response = await apiClient.put(
    `enquiries/${session.id}`,
    enquiryPayload(draft),
    {
      headers: { Authorization: `Bearer ${session.token}` },
    },
  );
  const saved = responseSchema.parse(response.data);
  if (saved.id !== session.id) throw new Error('Unexpected enquiry reference.');
  return {
    id: saved.id,
    revision: saved.revision,
    status: saved.status,
    requestKey: enquiryKey(draft),
    total: saved.details.total,
    items: saved.details.items,
  };
}
export async function confirmEnquiry(
  session: EnquirySession,
  revision: string,
) {
  const response = await apiClient.post(
    `enquiries/${session.id}/confirm`,
    { revision },
    {
      headers: { Authorization: `Bearer ${session.token}` },
    },
  );
  const saved = responseSchema.parse(response.data);
  if (
    saved.id !== session.id ||
    saved.status !== 'CONFIRMED' ||
    saved.revision !== revision
  )
    throw new Error('Confirmation was not received.');
  return saved.id;
}
