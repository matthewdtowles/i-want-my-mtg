# CloudFront API caching (#621)

These files are the policies to create in the CloudFront console. Nothing here is applied automatically.

## Cache behaviors, in precedence order

| Order | Path pattern | Cache policy | Origin request policy | Allowed methods |
|---|---|---|---|---|
| 1 | `/api/v1/sets` | `IwmmCatalogIndexAuthAware` | none | GET, HEAD, OPTIONS |
| 2 | `/api/v1/sets/*` | `IwmmPublicCatalog` | `IwmmPublicCatalogIdentity` | GET, HEAD, OPTIONS |
| 3 | `/api/v1/cards*` | `IwmmPublicCatalog` | `IwmmPublicCatalogIdentity` | GET, HEAD, OPTIONS |
| last | `/api/*` (existing) | unchanged | unchanged | unchanged |

- **1** varies per user, so the login header and cookie are part of the cache key. Signed-in responses come back `private, no-store` and are never stored.
- **2 and 3** return the same data to everyone. The cache key is the query string only. The origin request policy still passes the caller's credentials (`Authorization`, `X-API-Key`, the RapidAPI headers and the `authorization` cookie) on a cache miss, so rate limits and usage counting see who is calling. Forwarding credentials outside the cache key is safe here because these responses do not vary by user, and signed-in responses come back `private, no-store` with a minimum TTL of 0, so CloudFront neither stores them nor shares them between simultaneous requests.
- `OPTIONS` lets browser preflights reach the origin (#616).

## Known limits

- RapidAPI traffic to path 1 counts as anonymous on a cache miss, because that behavior has no origin request policy.
- Cache hits never reach the origin, so API-key usage is only counted on misses.

## Verify

Use a GET, not `curl -I`. The origin marks every non-GET response `no-store`, including HEAD.

```
curl -s -o /dev/null -D - https://iwantmymtg.net/api/v1/sets/fdn | grep -i x-cache   # twice: Miss, then Hit
```

Then confirm a signed-in caller still gets its own `ownedTotal` from `/api/v1/sets`.
