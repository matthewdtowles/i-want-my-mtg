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
- **2 and 3** return the same data to everyone. The cache key is the query string only. The origin request policy still passes `X-API-Key` and the RapidAPI headers on a cache miss, so rate limits and usage counting see who is calling.
- `OPTIONS` lets browser preflights reach the origin (#616).

## Known limits

- An API key sent as `Authorization: Bearer iwm_live_...` instead of `X-API-Key` counts as anonymous on a cache miss on paths 2 and 3. So does a signed-in app user. CloudFront only forwards `Authorization` if it is part of the cache key, which would stop those callers getting cache hits. #622 makes the anonymous limit per visitor, which covers this.
- Cache hits never reach the origin, so API-key usage is only counted on misses.

## Verify

Use a GET, not `curl -I`. The origin marks every non-GET response `no-store`, including HEAD.

```
curl -s -o /dev/null -D - https://iwantmymtg.net/api/v1/sets/fdn | grep -i x-cache   # twice: Miss, then Hit
```

Then confirm a signed-in caller still gets its own `ownedTotal` from `/api/v1/sets`.
