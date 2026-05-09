# RapidAPI Listing - Ongoing & Loose Ends

Listing is live and public. What's left is small Studio form-filling + one recurring code-side task.

---

## Loose ends in Studio (no code, just form-filling)

- **General tab** — write a 2-3 paragraph public description; set a support email.
- **Docs tab** — currently shows "Documentation is not set". Paste a markdown overview: auth (`X-RapidAPI-Key` header), base URL, the three endpoint groups (cards / sets / sealed-products), per-tier rate limits, one curl example. Pull content from `src/http/views/developerGettingStarted.hbs` and `developerDocs.hbs` rather than rewriting from scratch.
- **Account → Payout Settings** — connect PayPal (RapidAPI's only provider payout option).
- **Endpoints tab** — click "Test" on each endpoint, confirm 200 + JSON. Inputs to use are in the appendix below. If anything 401s, `RAPIDAPI_PROXY_SECRET` in prod env doesn't match Studio → Gateway → Firewall Settings.

---

## Re-sync OpenAPI spec after API changes

URL-based auto-sync isn't available on personal/free provider accounts. Manual workflow:

```bash
curl https://iwantmymtg.net/api/openapi-public.json -o openapi-public.json
```

Then in Studio: Definitions → CI/CD → Import OpenAPI → upload the file.

Re-do this after any meaningful API change (new endpoint, schema change). Not needed for code-only changes that don't affect the spec.

---

## Volume sanity-check (only if needed)

Skip unless real traffic appears and something looks off. If RapidAPI's dashboard count diverges noticeably from your own origin counts, the proxy guard is dropping or accepting traffic it shouldn't. To count from the origin side, either add `$http_x_rapidapi_proxy_secret` to nginx's `log_format` temporarily, or add an info log on success in `RapidApiProxyGuard` (`src/http/api/shared/rapidapi-proxy.guard.ts`) and grep app logs.

---

## Adjacent free marketplaces

Only after RapidAPI is stable for 1-2 weeks and there's real subscriber activity worth amplifying.

- **APIs.guru** — PR to https://github.com/APIs-guru/openapi-directory adding `openapi-public.json`.
- **Postman API Network** — create a Postman workspace, import the spec, mark public.
- **Public APIs GitHub repo** — PR to https://github.com/public-apis/public-apis adding a row under "Games & Comics".

---

## Appendix: Endpoint test inputs

| Endpoint | Test input |
|---|---|
| `GET /api/v1/cards` | `?q=lightning bolt&limit=5` (param is `q`, required) |
| `GET /api/v1/cards/{cardId}/prices` | UUID returned from the search above |
| `GET /api/v1/cards/{cardId}/price-history` | same UUID |
| `GET /api/v1/cards/{setCode}/{setNumber}` | `LEA/161` (Lightning Bolt) |
| `GET /api/v1/cards/{setCode}/{setNumber}/prices` | `LEA/161` |
| `GET /api/v1/cards/{setCode}/{setNumber}/price-history` | `LEA/161` |
| `GET /api/v1/sets` | `?limit=10` |
| `GET /api/v1/sets/{code}` | `LEA` |
| `GET /api/v1/sets/{code}/cards` | code `LEA`, query `?limit=10` |
| `GET /api/v1/sets/{code}/price-history` | `LEA` |
| `GET /api/v1/sets/{code}/sealed-products` | `MH3` (recent set with sealed products) |
| `GET /api/v1/sealed-products/{uuid}` | uuid from the list above |
| `GET /api/v1/sealed-products/{uuid}/price-history` | same uuid |
