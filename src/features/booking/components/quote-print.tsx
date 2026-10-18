import { uiCopy } from '@/config/copy';
import React from 'react';
import { Button } from '@/components/ui/button';
import { business } from '@/config/business';
import { money, isCoupleShoot, type Ceremony } from '../quote';

export type PrintDetails = {
  name: string;
  mobile: string;
  eventType: string;
  quoteVersion?: number;
  ceremonies?: Ceremony[];
  albumQuantity?: number;
  albumSize?: string;
  albumDelivery?: string;
  notes?: string;
  pricingStatus?: string;
};
export type PrintSnapshot = {
  status: 'ATTEMPTED' | 'CONFIRMED';
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    unit?: string;
    groupId?: string;
    groupName?: string;
    serviceId?: string;
  }[];
};

/** A print-only document; every monetary value comes from the saved snapshot. */
export function QuotePrint({
  details,
  saved,
}: {
  details: PrintDetails;
  saved: PrintSnapshot;
}) {
  const groups = [...new Set(saved.items.map((item) => item.groupId))];
  const sample =
    details.pricingStatus === 'DEVELOPMENT_SAMPLE' ||
    (!details.pricingStatus && details.quoteVersion === 2);
  return (
    <article className="quote-print" aria-label="Printable quote">
      <header>
        <p className="quote-print-brand">{business.name}</p>
        <p>
          {business.address}
          <br />
          Phone: {business.phone}
        </p>
        <h1>Photography quote</h1>
      </header>
      <dl className="quote-print-details">
        <div>
          <dt>Prepared for</dt>
          <dd>
            {details.name.trim()} · +91 {details.mobile}
          </dd>
        </div>
        <div>
          <dt>Occasion</dt>
          <dd>
            {details.eventType === 'Marriage' ? 'Wedding' : details.eventType}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {saved.status === 'CONFIRMED'
              ? uiCopy.status.sentQuote
              : 'Saved quote - not sent to studio'}
          </dd>
        </div>
      </dl>
      <p className="quote-print-notice">
        {sample ? 'Development sample prices' : 'Saved quote'} · INR. Final
        services, crew, deliverables and availability require studio
        confirmation.
      </p>
      <table>
        <thead>
          <tr>
            <th>Selected service</th>
            <th>Unit price</th>
            <th>Billable quantity</th>
            <th>Amount</th>
          </tr>
        </thead>
        {groups.map((group) => {
          const items = saved.items.filter((item) => item.groupId === group);
          const ceremony = details.ceremonies?.find((c) => c.id === group);
          const groupName = items[0].groupName || 'Selected services';
          return (
            <tbody key={group ?? 'ungrouped'}>
              <tr className="quote-print-group">
                <th colSpan={4}>
                  {groupName}
                  {ceremony && group && isCoupleShoot(details.eventType, group)
                    ? ` · ${ceremony.days} day${ceremony.days > 1 ? 's' : ''}`
                    : ''}
                </th>
              </tr>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    <small>
                      {item.unit}
                      {ceremony && group && item.serviceId
                        ? ` · ${ceremony.quantities[item.serviceId] ?? 1} service unit(s)${isCoupleShoot(details.eventType, group) ? ` × ${ceremony.days} day(s)` : ''}`
                        : ''}
                    </small>
                  </td>
                  <td>{money(item.price)}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.price * item.quantity)}</td>
                </tr>
              ))}
              <tr className="quote-print-subtotal">
                <td colSpan={3}>{groupName} subtotal</td>
                <td>
                  {money(
                    items.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    ),
                  )}
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>
      <section className="quote-print-total">
        <span>{sample ? 'Total sample quote' : 'Total saved quote'}</span>
        <strong>{money(saved.total)}</strong>
      </section>
      {(details.albumQuantity ?? 0) > 0 && (
        <p>
          Album quantity: {details.albumQuantity}. Album size:{' '}
          {details.albumSize?.replace('x', ' × ') || 'Discuss with studio'}.
          Delivery preference:{' '}
          {details.albumDelivery === 'one-month'
            ? '1 month'
            : details.albumDelivery === 'three-month'
              ? '3 months'
              : 'Discuss with studio'}
          . Album pages, finish, delivery timeline and any delivery fee require
          confirmation.
        </p>
      )}
      {details.notes?.trim() && (
        <section className="quote-print-notes">
          <h2>Your notes</h2>
          <p>{details.notes.trim()}</p>
        </section>
      )}
      <footer>
        <p>
          {sample
            ? 'Travel, tax and delivery charges are not included in this sample calculation. '
            : 'Prices reflect the saved request; any additional charges require studio confirmation. '}
          Quantities represent service units, multiplied by days where shown.
          This quote is not an invoice, payment receipt or date reservation.
        </p>
        <p>
          Contact {business.name} on {business.phone} to discuss your request.
        </p>
      </footer>
    </article>
  );
}

export function SaveQuotePdf({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="quote-pdf-action">
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => window.print()}
      >
        Save as PDF / Print
      </Button>
      <p className="booking-note">
        {disabled
          ? 'Save your changes first to export the updated quote.'
          : 'Choose “Save as PDF” in the print window. Includes every selected service and the full price breakdown. Turn off browser headers and footers to omit the page URL.'}
      </p>
    </div>
  );
}
