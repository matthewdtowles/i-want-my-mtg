import { buildPublicSpec, publicPathAllowlist } from 'src/http/api/openapi-public-spec';

function fakeDoc() {
    return {
        info: { title: 'Internal', description: 'internal', version: '1.0' },
        security: [{ bearer: [] }],
        components: { securitySchemes: { bearer: { type: 'http' } } },
        paths: {
            '/api/v1/cards': { get: { operationId: 'searchCards' } },
            '/api/v1/cards/{cardId}/prices': { get: { operationId: 'getCardPrices' } },
            '/api/v1/cards/{cardId}/price-history': {
                get: { operationId: 'getCardPriceHistory' },
            },
            '/api/v1/cards/{setCode}/{setNumber}': {
                get: { operationId: 'getCardBySetAndNumber' },
            },
            '/api/v1/cards/{setCode}/{setNumber}/prices': {
                get: { operationId: 'getCardPricesBySetAndNumber' },
            },
            '/api/v1/cards/{setCode}/{setNumber}/price-history': {
                get: { operationId: 'getCardPriceHistoryBySetAndNumber' },
            },
            '/api/v1/sets': { get: { operationId: 'listSets' } },
            '/api/v1/sets/{code}': { get: { operationId: 'getSet' } },
            '/api/v1/sets/{code}/cards': { get: { operationId: 'getSetCards' } },
            '/api/v1/sets/{code}/price-history': { get: { operationId: 'getSetPriceHistory' } },
            '/api/v1/sets/{code}/sealed-products': {
                get: { operationId: 'listSealedProductsForSet' },
            },
            '/api/v1/sealed-products/{uuid}': { get: { operationId: 'getSealedProduct' } },
            '/api/v1/sealed-products/{uuid}/price-history': {
                get: { operationId: 'getSealedProductPriceHistory' },
            },
            '/api/v1/inventory': {
                get: { operationId: 'listInventory' },
                post: { operationId: 'addInventory' },
            },
            '/api/v1/inventory/sealed': {
                get: { operationId: 'listSealedInventory' },
                post: { operationId: 'addSealedInventory' },
                patch: { operationId: 'updateSealedInventory' },
                delete: { operationId: 'removeSealedInventory' },
            },
            '/api/v1/portfolio': { get: { operationId: 'getPortfolio' } },
            '/api/v1/transactions': {
                get: { operationId: 'listTransactions' },
                post: { operationId: 'createTransaction' },
            },
            '/api/v1/auth/login': { post: { operationId: 'login' } },
            '/api/v1/billing/checkout': { post: { operationId: 'checkout' } },
        },
    };
}

describe('buildPublicSpec', () => {
    it('exposes exactly the allowlisted paths and no others', () => {
        const spec = buildPublicSpec(fakeDoc());
        expect(Object.keys(spec.paths).sort()).toEqual([...publicPathAllowlist()].sort());
    });

    it('strips UUID-keyed card and sealed-product endpoints', () => {
        const spec = buildPublicSpec(fakeDoc());
        expect(spec.paths['/api/v1/cards/{cardId}/prices']).toBeUndefined();
        expect(spec.paths['/api/v1/cards/{cardId}/price-history']).toBeUndefined();
        expect(spec.paths['/api/v1/sealed-products/{uuid}']).toBeUndefined();
        expect(spec.paths['/api/v1/sealed-products/{uuid}/price-history']).toBeUndefined();
    });

    it('strips user-scoped paths (inventory, portfolio, transactions, auth, billing)', () => {
        const spec = buildPublicSpec(fakeDoc());
        expect(spec.paths['/api/v1/inventory']).toBeUndefined();
        expect(spec.paths['/api/v1/inventory/sealed']).toBeUndefined();
        expect(spec.paths['/api/v1/portfolio']).toBeUndefined();
        expect(spec.paths['/api/v1/transactions']).toBeUndefined();
        expect(spec.paths['/api/v1/auth/login']).toBeUndefined();
        expect(spec.paths['/api/v1/billing/checkout']).toBeUndefined();
    });

    it('keeps only GET methods on allowlisted paths', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc: any = fakeDoc();
        // Inject a write method on an allowlisted path to confirm it gets stripped.
        doc.paths['/api/v1/cards'].post = { operationId: 'shouldNotLeak' };
        const spec = buildPublicSpec(doc);
        expect(Object.keys(spec.paths['/api/v1/cards'])).toEqual(['get']);
    });

    it('strips bearer security scheme and top-level security', () => {
        const spec = buildPublicSpec(fakeDoc());
        expect(spec.security).toBeUndefined();
        expect(spec.components.securitySchemes).toBeUndefined();
    });

    it('rewrites info.title and info.description for marketplace consumers', () => {
        const spec = buildPublicSpec(fakeDoc());
        expect(spec.info.title).toBe('I Want My MTG — Public API');
        expect(spec.info.description).toMatch(/Read-only catalog endpoints/);
        expect(spec.info.description).toMatch(/RapidAPI marketplace/);
    });

    it('does not mutate the input document', () => {
        const doc = fakeDoc();
        const before = JSON.stringify(doc);
        buildPublicSpec(doc);
        expect(JSON.stringify(doc)).toBe(before);
    });
});
