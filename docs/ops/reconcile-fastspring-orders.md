# FastSpring order reconciliation

## Purpose

This read-only tool checks that every recent completed **live** FastSpring order for product path
`muedsp-masterchain` has both local fulfillment facts:

1. an `order.completed` row in `webhook_events` with `source = 'fastspring'`; and
2. a `masterchain_purchases` row whose `license_key` is non-empty.

It also reports recent product orders found in the database but absent from the FastSpring result.
The tool never issues a license, sends email, changes an order, or writes to the database.

FastSpring retries an unprocessed webhook up to 12 times over seven days. Once that retry window has
expired, webhook delivery can no longer fulfill the order. The default lookback is therefore eight
days: one day beyond the retry window, so a permanently missed order becomes visible in the next
periodic run. See [FastSpring's processed and unprocessed webhook events documentation](https://developer.fastspring.com/reference/processed-and-unprocessed-webhook-events).

## Live usage

Set these environment variables in `.env.local` or the process environment:

- `FASTSPRING_API_USERNAME` — FastSpring API username.
- `FASTSPRING_API_PASSWORD` — FastSpring API password.
- `DATABASE_URL` — read-capable PostgreSQL/Neon connection string.

Run the default eight-day check:

```bash
npm run ops:reconcile-fastspring-orders
```

Choose another positive lookback:

```bash
npm run ops:reconcile-fastspring-orders -- --days 14
```

The script calls `GET https://api.fastspring.com/orders` with Basic authentication and the filters
`products=muedsp-masterchain`, `status=completed`, and `scope=live`. It follows FastSpring's paginated
result until all returned order IDs have been collected.

## Fixture dry run

Use a fixture to exercise reconciliation and output formatting without FastSpring credentials or a
database connection:

```bash
npm run ops:reconcile-fastspring-orders -- --dry-run --fixture ./reconcile-fixture.json
```

Fixture shape:

```json
{
  "fastspringOrderIds": ["ORDER-1", "ORDER-2"],
  "databaseOrders": [
    {
      "orderId": "ORDER-1",
      "webhookEventId": "evt-1",
      "webhookStatus": "processed",
      "hasLicense": true
    },
    {
      "orderId": "ORDER-2",
      "webhookEventId": "evt-2",
      "webhookStatus": "processed",
      "hasLicense": false
    }
  ]
}
```

`--fixture` and `--dry-run` must be supplied together. Fixture mode does not read any of the three
environment variables.

## Reading the result

The output has three sections:

- `matched`: the FastSpring order has a webhook row and an issued license.
- `missing-in-db`: one or both local facts are absent; the line names the missing facts.
- `present-in-db-but-not-in-fastspring`: a recent, product-scoped local order was not returned by the
  filtered FastSpring query. Investigate test/live scope, timestamps, refunds, and product metadata.

The process exits with status `1` when `missing-in-db` contains any orders, `0` when none are missing,
and `2` for configuration, fixture, API, or database failures. Database-only rows are reported but do
not by themselves make the exit status non-zero.

## When an order is missing

Escalate to conductor with the affected FastSpring order IDs and the missing facts printed for each
one. Do not paste API credentials, database URLs, customer details, or license keys into the
escalation. Manual fulfillment is intentionally out of scope for this tool; do not issue a license or
send a delivery email from the reconciliation script.
