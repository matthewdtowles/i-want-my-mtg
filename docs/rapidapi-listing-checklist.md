# RapidAPI Listing - Remaining Steps

Steps 1-3 complete (deploy, General tab content, API documentation). Remaining work below.

---

## Step 4 - Payout details

Studio -> Account -> Payout Settings.

- Pick Stripe (already have an account from 3.4).
- Connect via OAuth, confirm the bank account, accept ToS.
- Required before paid-tier subscriptions can pay out.

---

## Step 5 - Test Endpoint flow

Studio -> Endpoints. Run each endpoint and verify the response shape.

| Endpoint | Test input |
|---|---|
| `GET /api/v1/cards` | `?name=lightning bolt&limit=5` |
| `GET /api/v1/cards/{cardId}` | use a UUID returned from the search above |
| `GET /api/v1/cards/{cardId}/prices` | same UUID |
| `GET /api/v1/cards/{cardId}/price-history` | same UUID |
| `GET /api/v1/cards/{setCode}/{setNumber}` | `LEA/161` (Lightning Bolt) |
| `GET /api/v1/cards/{setCode}/{setNumber}/prices` | `LEA/161` |
| `GET /api/v1/cards/{setCode}/{setNumber}/price-history` | `LEA/161` |
| `GET /api/v1/sets` | `?limit=10` |
| `GET /api/v1/sets/{code}` | `LEA` |
| `GET /api/v1/sets/{code}/cards` | `LEA?limit=10` |
| `GET /api/v1/sets/{code}/price-history` | `LEA` |
| `GET /api/v1/sets/{code}/sealed-products` | `MH3` (recent set with sealed products) |
| `GET /api/v1/sealed-products/{uuid}` | uuid from the list above |
| `GET /api/v1/sealed-products/{uuid}/price-history` | same uuid |

For each: confirm 200, JSON, and `data` shape matches the spec.

If anything 401s: the `RapidApiProxyGuard` wiring isn't taking. Check `RAPIDAPI_PROXY_SECRET` is set in prod and matches Studio -> Gateway -> Firewall Settings.

---

## Step 6 - Re-sync OpenAPI spec from prod URL

Studio -> Definitions -> CI/CD.

- Switch source from "File upload" to "URL".
- Point at `https://iwantmymtg.net/api/openapi-public.json`.
- Set sync to manual or daily.

Keeps the listing in sync as endpoints evolve.

---

## Step 7 - Toggle public + submit for review

General tab -> Visibility = Public -> Submit for Review.

(Listing already shows 1 subscriber so it's at least discoverable. Confirm and submit.)

Approval is 1-3 business days.

---

## Step 8 - Post-listing checks (week 1)

### Add badge on `/developer`

Edit `src/http/views/developer.hbs`:

```html
<a href="https://rapidapi.com/<your-handle>/api/i-want-my-mtg" class="...">
  Available on RapidAPI
</a>
```

### Cross-check volume

Pull a day's count from RapidAPI's analytics dashboard. Compare to origin logs filtered to requests with the `X-RapidAPI-Proxy-Secret` header. Should match within a few percent.

```bash
# On prod (or via log pipeline):
grep "X-RapidAPI-Proxy-Secret" /var/log/.../access.log | wc -l
```

If counts diverge: the proxy guard is dropping or accepting traffic it shouldn't.

---

## Step 9 - Adjacent free marketplaces

Only after RapidAPI is stable for 1-2 weeks.

- **APIs.guru** - PR to https://github.com/APIs-guru/openapi-directory adding `openapi-public.json`. Free, no curation.
- **Postman API Network** - create a Postman workspace, import the spec, mark public.
- **Public APIs GitHub repo** - PR to https://github.com/public-apis/public-apis adding a row under "Games & Comics".
