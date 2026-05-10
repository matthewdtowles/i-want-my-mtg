/**
 * The set of paths exposed at `/api/openapi-public.json` for the RapidAPI listing.
 * External callers address cards by `{setCode}/{setNumber}` and sealed products by
 * set — UUID-keyed *paths* are omitted from the public surface (UUIDs may still
 * appear in response bodies as identifiers). Sealed pricing is intentionally absent
 * — we don't have reliable sealed prices, and buy-intent flows through the
 * TCGPlayer affiliate link instead.
 */
const PUBLIC_PATH_ALLOWLIST: ReadonlyArray<string> = [
    '/api/v1/cards',
    '/api/v1/cards/{setCode}/{setNumber}',
    '/api/v1/cards/{setCode}/{setNumber}/prices',
    '/api/v1/cards/{setCode}/{setNumber}/price-history',
    '/api/v1/sets',
    '/api/v1/sets/{code}',
    '/api/v1/sets/{code}/cards',
    '/api/v1/sets/{code}/price-history',
    '/api/v1/sets/{code}/sealed-products',
];

export function publicPathAllowlist(): ReadonlyArray<string> {
    return PUBLIC_PATH_ALLOWLIST;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildPublicSpec(doc: any): any {
    const allowed = new Set<string>(PUBLIC_PATH_ALLOWLIST);
    const clone = JSON.parse(JSON.stringify(doc));
    for (const path of Object.keys(clone.paths || {})) {
        if (!allowed.has(path)) {
            delete clone.paths[path];
            continue;
        }
        for (const method of Object.keys(clone.paths[path])) {
            if (method.toLowerCase() !== 'get') delete clone.paths[path][method];
        }
        if (Object.keys(clone.paths[path]).length === 0) delete clone.paths[path];
    }
    if (clone.components?.securitySchemes) delete clone.components.securitySchemes;
    delete clone.security;
    clone.info = clone.info || {};
    clone.info.title = 'I Want My MTG — Public API';
    clone.info.description =
        'Read-only catalog endpoints (cards, sets, sealed products, prices, price history). ' +
        'No authentication required when called via the RapidAPI marketplace.';
    return clone;
}
