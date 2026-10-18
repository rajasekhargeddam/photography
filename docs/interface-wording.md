# Interface wording

Repeated action labels are defined in `src/config/copy.ts`. Use those values when
adding or changing navigation actions instead of introducing new variants.

| Meaning                                        | Wording               |
| ---------------------------------------------- | --------------------- |
| Open or start the quote builder                | Build your quote      |
| Open the contact page                          | Contact the studio    |
| Browse photography                             | View portfolio        |
| Browse client testimonials                     | View testimonials     |
| Browse portfolio films                         | View films            |
| Request a phone conversation                   | Request a call        |
| Save contact details and open the quote review | Save and review quote |
| Submit a saved quote for studio follow-up      | Send quote to studio  |
| Return to the quote review                     | Review your quote     |
| Return to the homepage                         | Back to home          |
| Repeat a failed action                         | Try again             |

Use **quote** for the photography price breakdown throughout the interface and
printout. Keep sample-price and final-price caveats intact. A **saved quote** is
saved contact details and selections. **Sent to studio** means the customer
submitted the quote request for follow-up; it does not mean a date is reserved,
payment is collected, or the studio has confirmed a booking.

Use **Quote requests** and **Call requests** in admin. Use **Films** as the
portfolio content label, **Testimonials** for client feedback, **Mobile number**
for customer contact fields, and **Event date** for date fields. Navigation labels
may use the short destination names (Portfolio, Contact, Testimonials).

Internal routes, API fields, database statuses, and existing category values keep
their identifiers. For example, the CONFIRMED status displays as Sent to studio;
the Marriage event value displays as Wedding. Wording changes must not change
these stored values or workflow behavior.
