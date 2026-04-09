# Sealed Product Support  - Plan

## Context

Sealed product tracking is a core gap in the collection tracker. Many collectors keep sealed boxes, bundles, and collector boosters in their collections. This was previously roadmapped as Phase 3.4 but is being promoted to 3.1 since affiliate links (blocked on approvals) and Stripe (needs more feature surface) are lower priority.

This plan covers: ROADMAP reordering, data model design (DB tables, domain entities, ORM entities, mappers, ports, DTOs), and a detailed task breakdown for both the web app and Scry ETL.

## MTGJSON Sealed Product Data Model (Source)

From MTGJSON, each set's `sealedProduct` array contains objects with:
- `uuid` (string, required) - MTGJSON v5 UUID, our PK
- `name` (string, required) - e.g. "Bloomburrow Draft Booster Box"
- `setCode` (string, required) - set code, present on every product
- `category` (string, optional) - e.g. "booster_box", "bundle", "deck", "booster_pack", "box_set", etc.
- `subtype` (string|null, required) - e.g. "draft", "collector", "set", "default"
- `cardCount` (number, optional) - number of cards in product
- `productSize` (number, optional) - number of packs/items in product
- `releaseDate` (string, optional) - ISO 8601 date
- `identifiers` (object, required) - contains `tcgplayerProductId`, `cardKingdomId`, `mcmId`, etc. **We do not store any of these** - no concrete use case; TCGPlayer price is already our price source via MTGJSON
- `purchaseUrls` (object, required) - only ever contains `tcgplayer` for sealed products (Card Kingdom and Cardmarket URLs are not provided by MTGJSON for sealed products)
- `contents` (object, optional) - nested structure describing what's inside (packs, cards, decks, accessories). **Flattened to a display string by Scry at ETL time** (see contents section below)

Each sealed product variant (draft booster box, collector booster box, bundle, commander deck, etc.) is a separate entry with its own UUID. No need for normal/foil price distinction. Each sealed product belongs to exactly one set.

### Contents Structure (SealedProductContents)

The `contents` object has these child types, all optional:
- `sealed` - inner sealed products with `count`, `name`, `set`, `uuid` (e.g. "12x Collector Booster Pack")
- `pack` - booster pack configs with `code`, `set` (e.g. prerelease config)
- `card` - specific promo/bonus cards with `name`, `number`, `set`, `uuid`, `foil` 
- `deck` - pre-constructed decks with `name`, `set`
- `other` - non-card items with `name` (spindowns, storage boxes, reference cards)
- `variable` - when contents can vary; contains `configs: SealedProductContents[]` (rare, not seen in practice)

Scry flattens this to a human-readable string at ETL time. Examples:
- Booster Box: "12x Collector Booster Pack"
- Bundle: "9x Play Booster Pack, Thundertrap Trainer (Foil), Bloomburrow Bundle Land Pack, Bloomburrow Spindown, Card-storage box, 2 Reference cards"
- Commander Deck: "Eldrazi Unbound, 1x Commander Masters Collector Booster Sample Pack"
- Prerelease Pack: "6x Play Booster Pack, Bloomburrow Spindown"
- Starter Kit: "Otter Limits, Hare Raising"
- Subset: "1x Bloomburrow Tin Mouse, 1x Bloomburrow Tin Otter, 1x Bloomburrow Tin Skunk"

### Online-Only Filtering

Scry must filter out online-only products at two levels:
1. **Set level** - skip sets with `isOnlineOnly: true` (e.g. MTGO/Arena-only sets)
2. **Product level** - within paper sets, filter out products with "MTGO" or "Arena" in the name (e.g. "Bloomburrow MTGO Redemption")

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
    contents_summary TEXT,
    purchase_url_tcgplayer CHARACTER VARYING
);

CREATE INDEX idx_sealed_product_set_code ON sealed_product (set_code);
CREATE INDEX idx_sealed_product_category ON sealed_product (category);
```

**Contents as display string**: The MTGJSON `contents` field is a deeply nested structure. Rather than storing it as JSONB or normalizing into tables, Scry flattens it to a human-readable summary string at ETL time. This avoids JSONB in PostgreSQL while still giving users useful "what's in the box" info.

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

Simpler than card inventory  - no foil variant dimension.

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

Single `price` column  - no normal/foil distinction. Each sealed product variant (draft box, collector box, bundle, etc.) is already a separate row with its own UUID and price.

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

### Card Purchase URLs (migration 028, separate file)

Cards currently have no purchase URL storage. Add TCGPlayer URLs to enable affiliate links on card pages.

```sql
ALTER TABLE public.card ADD COLUMN purchase_url_tcgplayer CHARACTER VARYING;
ALTER TABLE public.card ADD COLUMN purchase_url_tcgplayer_etched CHARACTER VARYING;
```

`purchase_url_tcgplayer` covers the normal/foil product page (TCGPlayer uses the same URL for both). `purchase_url_tcgplayer_etched` is for etched finish variants (rare, NULL for ~99% of cards). No separate price columns needed - our existing `price.normal`/`price.foil` values already come from TCGPlayer via MTGJSON.

## NestJS Architecture - Files to Create

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
| `sealed-product.hbs` | Set detail  - sealed products section |
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
    readonly category?: string;        // "booster_box", "bundle", "deck", etc.
    readonly subtype?: string;         // "draft", "collector", "set", "default", etc.
    readonly cardCount?: number;
    readonly productSize?: number;
    readonly releaseDate?: string;
    readonly contentsSummary?: string;  // Flattened display string from Scry ETL
    readonly purchaseUrlTcgplayer?: string;
    readonly price?: SealedProductPrice;
}
```

## Scry ETL Impact

Scry (separate repo) will need:
1. New struct for sealed product data from MTGJSON
2. Mapper from MTGJSON JSON -> sealed product struct, including:
   - Flatten `contents` to a display string (e.g. "12x Collector Booster Pack, Thundertrap Trainer (Foil)")
   - Extract `purchaseUrls.tcgplayer` as the single purchase URL
   - Skip online-only products: filter out products with "MTGO" or "Arena" in the name
3. Repository with UPSERT for `sealed_product` table
4. Hook into set ingestion pipeline (sealed products come as part of set data). Skip sets with `isOnlineOnly: true`
5. Price ingestion for sealed products (MTGJSON prices are keyed by UUID and include sealed products)
6. Card purchase URL ingestion: populate `purchase_url_tcgplayer` and `purchase_url_tcgplayer_etched` on the `card` table from MTGJSON's `purchaseUrls` field during card ingestion

This is out of scope for this repo but the DB migration and domain model must be designed to support it.

## API Endpoints

```
GET  /api/v1/sets/:code/sealed-products      - List sealed products for a set
GET  /api/v1/sealed-products/:uuid            - Get sealed product detail
GET  /api/v1/sealed-products/:uuid/price-history  - Price history
POST /api/v1/inventory/sealed/:uuid           - Add to inventory (auth required)
PUT  /api/v1/inventory/sealed/:uuid           - Update quantity (auth required)
DELETE /api/v1/inventory/sealed/:uuid         - Remove from inventory (auth required)
GET  /api/v1/inventory/sealed                 - List user's sealed inventory (auth required)
```

## ROADMAP.md Changes

Reorder Phase 3:
1. **3.1 Sealed Product Support** (was 3.4)  - promoted, unblocked, high user value
2. **3.2 Legal & Compliance** (was 3.5)  - should precede monetization
3. **3.3 Affiliate Integration** (was 3.1)  - blocked on TCGPlayer approval
4. **3.4 Freemium & Stripe** (was 3.2)  - needs more feature surface
5. **3.5 Deck Building** (was 3.3)  - unchanged priority relative to monetization

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
