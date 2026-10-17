import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuotePrint } from '../src/features/booking/components/quote-print';

test('historical print preserves saved package prices without requiring ceremony or album fields', () => {
  const html = renderToStaticMarkup(
    createElement(QuotePrint, {
      details: {
        name: 'Historical client',
        mobile: '9000000000',
        eventType: 'Marriage',
      },
      saved: {
        status: 'ATTEMPTED',
        total: 43210,
        items: [
          {
            id: 'internal-package-id',
            name: 'Saved package',
            price: 43210,
            quantity: 1,
          },
        ],
      },
    }),
  );
  assert.match(html, /43,210/);
  assert.match(html, /Saved package/);
  assert.match(html, /Selected services subtotal/);
  assert.match(html, /Total saved estimate/);
  assert.doesNotMatch(
    html,
    /internal-package-id|Reference|Development sample|undefined|NaN/,
  );
});
test('guided print uses snapshot amounts, groups, notes and sample notice for both saved and confirmed states', () => {
  for (const status of ['ATTEMPTED', 'CONFIRMED'] as const) {
    const html = renderToStaticMarkup(
      createElement(QuotePrint, {
        details: {
          name: 'Client',
          mobile: '9000000000',
          eventType: 'Marriage',
          quoteVersion: 2,
          notes: 'Keep these notes.',
          albumQuantity: 1,
          albumSize: '14x40',
          albumDelivery: 'three-month',
        },
        saved: {
          status,
          total: 2468,
          items: [
            {
              id: 'private-line-id',
              name: 'Saved coverage',
              price: 1234,
              quantity: 2,
              groupId: 'wedding',
              groupName: 'Wedding',
              unit: 'per ceremony',
            },
          ],
        },
      }),
    );
    assert.match(html, /2,468/);
    assert.match(html, /1,234/);
    assert.match(html, /Wedding subtotal/);
    assert.match(html, /Keep these notes/);
    assert.match(html, /14 × 40/);
    assert.match(html, /3 months/);
    assert.match(html, /Development sample prices/);
    assert.match(
      html,
      status === 'CONFIRMED' ? /request confirmed/ : /not yet confirmed/,
    );
    assert.doesNotMatch(html, /private-line-id|Reference|undefined|NaN/);
  }
});
