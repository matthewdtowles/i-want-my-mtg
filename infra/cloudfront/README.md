# CloudFront API caching (#621)

These files are the policies to create in the CloudFront console. Nothing here is applied automatically.

## Cache behaviors, in precedence order

| Order | Path pattern | Cache policy | Origin request policy | Allowed methods |
|---|---|---|---|---|
| 1 | `/api/v1/sets` | `IwmmCatalogIndexAuthAware` | none | GET, HEAD, OPTIONS |
| 2 | `/api/v1/sets/*/sealed-products` | `IwmmCatalogIndexAuthAware` | none | GET, HEAD, OPTIONS |
| 3 | `/api/v1/sets/*` | `IwmmPublicCatalog` | `IwmmPublicCatalogIdentity` | GET, HEAD, OPTIONS |
| 4 | `/api/v1/cards*` | `IwmmPublicCatalog` | `IwmmPublicCatalogIdentity` | GET, HEAD, OPTIONS |
| last | Default (`*`, existing) | `IwmmSiteDefaultAuthAware` | `Managed-AllViewerExceptHostHeader` (unchanged) | all (unchanged) |

- **1 and 2** vary per user (the set index adds owned totals, sealed products add `ownedQuantity`), so the login header and cookie are part of the cache key. Signed-in responses come back `private, no-store` and are never stored.
- **3 and 4** return the same data to everyone. The cache key is the query string only. The origin request policy still passes the caller's credentials (`Authorization`, `X-API-Key`, the RapidAPI headers and the `authorization` cookie) on a cache miss, so rate limits and usage counting see who is calling. Forwarding credentials outside the cache key is safe here because these responses do not vary by user (any new route under these paths that reads `req.user` needs its own rule, like 2), and signed-in responses come back `private, no-store` with a minimum TTL of 0, so CloudFront neither stores them nor shares them between simultaneous requests.
- `OPTIONS` lets browser preflights reach the origin (#616).
- **Default** serves every HTML page and every other API route. It used `Managed-CachingDisabled`, so every page view reached the origin even though signed-out pages already send `public, max-age=60`. `IwmmSiteDefaultAuthAware` honors that header and keys on the query string, `Authorization`, `X-API-Key` and the `authorization` cookie, which are every way a caller can identify itself: the web login cookie, the mobile app's bearer token and the MCP server's API key. So a cached copy is only ever served to a caller presenting the same credentials, and signed-in responses (`private, no-store`) are never stored at all. Its default TTL is 0 on purpose: redirects, errors, and the forms the exception filter re-renders with a 200 carry no `Cache-Control`, and must not be cached. The origin request policy is unchanged, so logins, form posts and the Stripe webhook reach the origin exactly as before. `test/integration/edge-cache-headers.e2e-spec.ts` pins the origin side of this. **Any new GET route that returns per-user content must run a guard that sets `req.user`**, or it will go out marked public.

## Origin secret header

On the distribution's origin, add a custom header `X-Origin-Verify` whose value matches the `CLOUDFRONT_ORIGIN_SECRET` GitHub secret (32+ random bytes, e.g. `openssl rand -hex 32`). The server only believes `X-Forwarded-For` when that header matches, because CloudFront's addresses are shared by every CloudFront customer. Without it, anonymous API callers share a rate-limit bucket per CloudFront address (#622).

## Known limits

- RapidAPI traffic to paths 1 and 2 counts as anonymous on a cache miss, because those behaviors have no origin request policy.
- Cache hits never reach the origin, so API-key usage is only counted on misses.
- Signed-out visitors can see a page up to 60 seconds old, or up to 6 minutes while CloudFront revalidates under `stale-while-revalidate=300`. That includes the first minutes after a deploy, which is why `verify-release.sh` adds a unique query string to its home page request.
- CloudFront caches a 4xx or 5xx that has no `Cache-Control` for 10 seconds (its error caching minimum TTL), per cache key.

## Applying the default behavior change

```
export AWS_PROFILE=portfolio DIST=E254IEMSQZLMSH
POLICY=$(aws cloudfront create-cache-policy \
  --cache-policy-config file://infra/cloudfront/cache-policies/iwmm-site-default-auth-aware.json \
  --query 'CachePolicy.Id' --output text)
aws cloudfront get-distribution-config --id $DIST > /tmp/dist.json
jq --arg p "$POLICY" '.DistributionConfig | .DefaultCacheBehavior.CachePolicyId = $p' /tmp/dist.json > /tmp/dist-new.json
aws cloudfront update-distribution --id $DIST --if-match "$(jq -r .ETag /tmp/dist.json)" \
  --distribution-config file:///tmp/dist-new.json
```

To roll back, run the last three commands with `p` set to `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` (`Managed-CachingDisabled`). A deploy of the distribution takes a few minutes either way.

## Verify

Use a GET, not `curl -I`. The origin marks every non-GET response `no-store`, including HEAD.

```
curl -s -o /dev/null -D - https://iwantmymtg.net/api/v1/sets/fdn | grep -i x-cache   # twice: Miss, then Hit
```

Then confirm a signed-in caller still gets its own `ownedTotal` from `/api/v1/sets`.

After the default behavior change:

```
curl -s -o /dev/null -D - https://iwantmymtg.net/card/mh3/1 | grep -iE 'x-cache|set-cookie'   # twice: Miss, then Hit; never a set-cookie
```

Then, signed in:

- Web: a card you own shows your quantity, and changing it shows the new number on reload. Signing out shows the page without it.
- Mobile: the Inventory tab lists your cards, and a card added from card detail appears straight away.
- MCP: `add_inventory` followed by `list_inventory` shows the new card.
- The next deploy's `verify-release.sh` passes.
