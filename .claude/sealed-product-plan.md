# Sealed Product Support — Plan

## Context

Sealed product tracking is a core gap in the collection tracker. Many collectors keep sealed boxes, bundles, and collector boosters in their collections. This was previously roadmapped as Phase 3.4 but is being promoted to 3.1 since affiliate links (blocked on approvals) and Stripe (needs more feature surface) are lower priority.

This plan covers: ROADMAP reordering, data model design (DB tables, domain entities, ORM entities, mappers, ports, DTOs), and a detailed task breakdown for both the web app and Scry ETL.

## MTGJSON Sealed Product Data Model (Source)

From MTGJSON, each set's `sealedProduct` array contains objects with:
- `uuid` (string, required) — MTGJSON v5 UUID, our PK
- `name` (string, required) — e.g. "Bloomburrow Draft Booster Box"
- `category` (string, optional) — e.g. "BOOSTER_BOX", "BUNDLE", "DECK"
- `subtype` (string|null, required) — e.g. "draft", "collector", "set"
- `cardCount` (number, optional) — number of cards in product
- `productSize` (number, optional) — number of packs/items in product
- `releaseDate` (string, optional) — ISO 8601 date
- `identifiers` (object, required) — contains `tcgplayerProductId`, `cardKingdomId`, `mcmId`, etc.
- `purchaseUrls` (object, required) — contains `tcgplayer`, `cardKingdom`, `cardmarket` URLs
- `contents` (object, optional) — deeply nested structure describing what's inside; **we are NOT storing this** — irrelevant for collection tracking

Each sealed product variant (draft booster box, collector booster box, bundle, commander deck, etc.) is a separate entry with its own UUID. No need for normal/foil price distinction.

## Database Design

### Table: `sealed_product` (migration 027)

```sql
CREATE TABLE public.sealed_product (
    uuid CHARACTER VARYING NOT NULL PRIMARY KEY,
    name CHARACTER VARYING NOT NULL,
    set_code CHARACTER VARYING NOT NULL REFERENCES public.set(code) ON DELETE CASCADE,
    category CHARACTER VARYING,
    subtype CHARACTER VARYING,
    card_count INTEGER,
    product_size INTEGER,
    release_date DATE,
    -- Marketplace identifiers (for future affiliate links & pricing)
    tcgplayer_product_id CHARACTER VARYING,
    cardkingdom_id CHARACTER VARYING,
    cardmarket_id CHARACTER VARYING,
    -- Purchase URLs
    purchase_url_tcgplayer CHARACTER VARYING,
    purchase_url_cardkingdom CHARACTER VARYING,
    purchase_url_cardmarket CHARACTER VARYING
);

CREATE INDEX idx_sealed_product_set_code ON sealed_product (set_code);
CREATE INDEX idx_sealed_product_category ON sealed_product (category);
```

**No contents column**: The MTGJSON `contents` field describes what's inside a product (packs, cards, decks, accessories). This is irrelevant for collection tracking — we care about the sealed product itself as an ownable item, not its theoretical contents.

### Table: `sealed_product_inventory` (migration 027, same file)

```sql
CREATE TABLE public.sealed_product_inventory (
    sealed_product_uuid CHARACTER VARYING NOT NULL
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (sealed_product_uuid, user_id)
);

CREATE INDEX idx_sealed_product_inventory_user ON sealed_product_inventory (user_id);
```

Simpler than card inventory — no foil variant dimension.

### Table: `sealed_product_price` (migration 027, same file)

```sql
CREATE TABLE public.sealed_product_price (
    sealed_product_uuid CHARACTER VARYING NOT NULL PRIMARY KEY
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    price NUMERIC,
    price_change_weekly NUMERIC,
    date DATE NOT NULL
);
```

Single `price` column — no normal/foil distinction. Each sealed product variant (draft box, collector box, bundle, etc.) is already a separate row with its own UUID and price.

### Table: `sealed_product_price_history` (migration 027, same file)

```sql
CREATE TABLE public.sealed_product_price_history (
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sealed_product_uuid CHARACTER VARYING NOT NULL
        REFERENCES public.sealed_product(uuid) ON DELETE CASCADE,
    price NUMERIC,
    date DATE NOT NULL,
    UNIQUE (sealed_product_uuid, date)
);
```

## NestJS Architecture — Files to Create

Following existing patterns (Set/Card as reference):

### Domain Layer (`src/core/sealed-product/`)

| File | Purpose |
|------|---------|
| `sealed-product.entity.ts` | Domain entity with `validateInit()`, readonly fields |
| `sealed-product-price.entity.ts` | Price domain entity (price, priceChangeWeekly, date) |
| `ports/sealed-product.repository.port.ts` | Repository interface |
| `sealed-product.service.ts` | Business logic, orchestrates repository calls |
| `sealed-product.module.ts` | NestJS module, imports DatabaseModule |

### Database Layer (`src/database/sealed-product/`)

| File | Purpose |
|------|---------|
| `sealed-product.orm-entity.ts` | TypeORM `@Entity('sealed_product')` |
| `sealed-product-price.orm-entity.ts` | TypeORM `@Entity('sealed_product_price')` |
| `sealed-product-inventory.orm-entity.ts` | TypeORM `@Entity('sealed_product_inventory')` |
| `sealed-product.mapper.ts` | ORM <-> domain mapping |
| `sealed-product-price.mapper.ts` | Price ORM <-> domain |
| `sealed-product.repository.ts` | Implements port, `@Injectable()` |

### HTTP / API Layer (`src/http/api/sealed-product/`)

| File | Purpose |
|------|---------|
| `dto/sealed-product-response.dto.ts` | API response DTO with Swagger decorators |
| `sealed-product-api.presenter.ts` | Maps domain -> API DTO |
| `sealed-product-api.controller.ts` | REST endpoints |

### HTTP / Views Layer (`src/http/hbs/sealed-product/`)

| File | Purpose |
|------|---------|
| `controllers/sealed-product.controller.ts` | View routes |
| `orchestrators/sealed-product.orchestrator.ts` | View assembly |
| `dto/sealed-product-view.dto.ts` | View DTOs |

### Views (`src/http/views/`)

| File | Purpose |
|------|---------|
| `sealed-product.hbs` | Set detail — sealed products section |
| `sealed-product-detail.hbs` | Individual sealed product page |

### Registration

- Add ORM entities to `DatabaseModule` `TypeOrmModule.forFeature()`
- Add `{ provide: SealedProductRepositoryPort, useClass: SealedProductRepository }` to providers/exports
- Add `SealedProductModule` to `CoreModule` imports
- Add controllers to `HttpModule`

## Domain Entity Design

```typescript
// sealed-product.entity.ts
export class SealedProduct {
    readonly uuid: string;
    readonly name: string;
    readonly setCode: string;
    readonly category?: string;        // "BOOSTER_BOX", "BUNDLE", "DECK", etc.
    readonly subtype?: string;         // "draft", "collector", "set", etc.
    readonly cardCount?: number;
    readonly productSize?: number;
    readonly releaseDate?: string;
    readonly tcgplayerProductId?: string;
    readonly cardkingdomId?: string;
    readonly cardmarketId?: string;
    readonly purchaseUrlTcgplayer?: string;
    readonly purchaseUrlCardkingdom?: string;
    readonly purchaseUrlCardmarket?: string;
    readonly price?: SealedProductPrice;
}
```

## Scry ETL Impact

Scry (separate repo) will need:
1. New struct for sealed product data from MTGJSON
2. Mapper from MTGJSON JSON -> sealed product struct
3. Repository with UPSERT for `sealed_product` table
4. Hook into set ingestion pipeline (sealed products come as part of set data)
5. Price ingestion for sealed products (MTGJSON prices are keyed by UUID and include sealed products)

This is out of scope for this repo but the DB migration and domain model must be designed to support it.

## API Endpoints

```
GET  /api/v1/sets/:code/sealed-products     — List sealed products for a set
GET  /api/v1/sealed-products/:uuid           — Get sealed product detail
GET  /api/v1/sealed-products/:uuid/price-history — Price history
POST /api/v1/inventory/sealed/:uuid          — Add to inventory (auth required)
PUT  /api/v1/inventory/sealed/:uuid          — Update quantity (auth required)
DELETE /api/v1/inventory/sealed/:uuid        — Remove from inventory (auth required)
GET  /api/v1/inventory/sealed                — List user's sealed inventory (auth required)
```

## ROADMAP.md Changes

Reorder Phase 3:
1. **3.1 Sealed Product Support** (was 3.4) — promoted, unblocked, high user value
2. **3.2 Legal & Compliance** (was 3.5) — should precede monetization
3. **3.3 Affiliate Integration** (was 3.1) — blocked on TCGPlayer approval
4. **3.4 Freemium & Stripe** (was 3.2) — needs more feature surface
5. **3.5 Deck Building** (was 3.3) — unchanged priority relative to monetization

Expand 3.1 with detailed sub-tasks covering:
- Database migration (both schema SQL and migration file)
- Scry ETL additions (separate repo, noted as dependency)
- Domain entities, ORM entities, mappers, ports, repositories
- Service layer
- API endpoints + presenter + DTOs
- View pages (sealed products on set page, sealed product detail)
- Inventory integration (add/remove sealed products to collection)
- Sealed product pricing and price history
- AJAX rendering for sealed product lists
- Tests (TDD: unit tests for service/presenter, integration tests for API)

## Verification

- Migration runs cleanly: `docker compose run --rm migrate`
- Unit tests pass: `docker compose exec web npm test`
- Integration tests pass: `npm run test:integ`
- Sealed product API returns data after ETL ingestion
- Set detail page shows sealed products section
- Users can add/remove sealed products from inventory
