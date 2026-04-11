# Sealed Product Support - Implementation Plan

## Context

Sealed product tracking (booster boxes, bundles, collector packs, etc.) is a core gap in the collection tracker. The plan document (`.claude/sealed-product-plan.md`) details the full design. This plan covers implementation order for the **web app** (this repo) and the **Scry ETL** (`../scry/`).

Implementation follows TDD (tests first) and the existing port-adapter architecture.

## Implementation Order

We work bottom-up: DB migration, then domain layer, then database layer, then service, then API, then views. Each layer gets tests before implementation.

---

### Phase A: Database Migration (this repo)

**Migration 027** (`migrations/027_sealed_product.sql`):
- `sealed_product` table (uuid PK, name, set_code FK, category, subtype, card_count, product_size, release_date, contents_summary, purchase_url_tcgplayer)
- `sealed_product_price` table (sealed_product_uuid PK/FK, price, price_change_weekly, date)
- `sealed_product_price_history` table (id IDENTITY PK, sealed_product_uuid FK, price, date, UNIQUE(uuid, date))
- `sealed_product_inventory` table (sealed_product_uuid + user_id composite PK, quantity)
- Indexes per plan doc

**Migration 028** (`migrations/028_card_purchase_urls.sql`):
- `ALTER TABLE card ADD COLUMN purchase_url_tcgplayer CHARACTER VARYING`
- `ALTER TABLE card ADD COLUMN purchase_url_tcgplayer_etched CHARACTER VARYING`

**Schema file update** (`docker/postgres/init/001_complete_schema.sql`):
- Add sealed product tables and card purchase URL columns

---

### Phase B: Domain Layer (this repo)

Files to create in `src/core/sealed-product/`:

1. **`sealed-product-price.entity.ts`** - Domain entity (price, priceChangeWeekly, date)
2. **`sealed-product.entity.ts`** - Domain entity with `validateInit()` (uuid, name, setCode required; category, subtype, cardCount, productSize, releaseDate, contentsSummary, purchaseUrlTcgplayer, price optional)
3. **`sealed-product-inventory.entity.ts`** - Domain entity (sealedProductUuid, userId, quantity)
4. **`ports/sealed-product.repository.port.ts`** - Repository interface with methods: `findBySetCode(code, options)`, `findByUuid(uuid)`, `findPriceHistory(uuid, days?)`, `findInventoryForUser(userId, options)`, `saveInventory(inventory)`, `deleteInventory(uuid, userId)`, `findInventoryItem(uuid, userId)`
5. **`sealed-product.service.ts`** - Business logic delegating to repository port
6. **`sealed-product.module.ts`** - NestJS module importing DatabaseModule

Reference patterns:
- `src/core/set/set.entity.ts` (domain entity with validateInit)
- `src/core/set/ports/set.repository.port.ts` (port as string token)
- `src/core/set/set.service.ts` (service with @Inject)
- `src/core/set/set.module.ts` (module structure)

---

### Phase C: Database Layer (this repo)

Files to create in `src/database/sealed-product/`:

1. **`sealed-product.orm-entity.ts`** - TypeORM `@Entity('sealed_product')` with ManyToOne to SetOrmEntity
2. **`sealed-product-price.orm-entity.ts`** - TypeORM `@Entity('sealed_product_price')` with OneToOne
3. **`sealed-product-inventory.orm-entity.ts`** - TypeORM `@Entity('sealed_product_inventory')` with ManyToOne to UserOrmEntity
4. **`sealed-product-price-history.orm-entity.ts`** - TypeORM `@Entity('sealed_product_price_history')`
5. **`sealed-product.mapper.ts`** - Static toCore/toOrmEntity methods
6. **`sealed-product-price.mapper.ts`** - Price mapping
7. **`sealed-product.repository.ts`** - Implements SealedProductRepositoryPort

Reference patterns:
- `src/database/set/set.orm-entity.ts`, `set.mapper.ts`, `set.repository.ts`
- `src/database/inventory/inventory.orm-entity.ts`

**Registration in DatabaseModule** (`src/database/database.module.ts`):
- Add 4 ORM entities to `TypeOrmModule.forFeature([])`
- Add `{ provide: SealedProductRepositoryPort, useClass: SealedProductRepository }`
- Add to exports

**Registration in CoreModule** (`src/core/core.module.ts`):
- Add `SealedProductModule` to imports/exports

---

### Phase D: API Layer (this repo)

Files to create in `src/http/api/sealed-product/`:

1. **`dto/sealed-product-response.dto.ts`** - API response DTO
2. **`sealed-product-api.presenter.ts`** - Domain -> DTO mapping
3. **`sealed-product-api.controller.ts`** - REST endpoints:
   - `GET /api/v1/sets/:code/sealed-products` - List sealed products for a set
   - `GET /api/v1/sealed-products/:uuid` - Get sealed product detail
   - `GET /api/v1/sealed-products/:uuid/price-history` - Price history

Sealed inventory endpoints added to existing inventory controller pattern or new controller:

4. **`dto/sealed-inventory-request.dto.ts`** - Request DTO (sealedProductUuid, quantity)
5. **Sealed inventory controller** at `api/v1/inventory/sealed/`:
   - `POST /api/v1/inventory/sealed` - Add to inventory
   - `PATCH /api/v1/inventory/sealed` - Update quantity
   - `DELETE /api/v1/inventory/sealed` - Remove
   - `GET /api/v1/inventory/sealed` - List user's sealed inventory

**Registration in ApiModule** (`src/http/api/api.module.ts`):
- Add new controllers

Reference: `src/http/api/inventory/inventory-api.controller.ts`

---

### Phase E: View Layer (this repo)

Files to create in `src/http/hbs/sealed-product/`:

1. **`sealed-product.orchestrator.ts`** - View assembly
2. **`sealed-product.controller.ts`** - View routes
3. **`dto/sealed-product-view.dto.ts`** - View DTOs

Views in `src/http/views/`:

4. **`partials/sealed-products.hbs`** - Sealed product list partial (for set detail page)
5. **`sealed-product-detail.hbs`** - Individual sealed product page

**Registration in HbsModule** (`src/http/hbs/hbs.module.ts`):
- Add controller and orchestrator

---

### Phase F: ROADMAP.md Update

Reorder Phase 3 as specified in the plan doc:
- 3.1 Sealed Product Support (promoted from 3.4)
- 3.2 Legal & Compliance (was 3.5)
- 3.3 Affiliate Integration (was 3.1)
- 3.4 Freemium & Stripe (was 3.2)
- 3.5 Deck Building (was 3.3)

Expand 3.1 with detailed sub-tasks.

---

### Phase G: Scry ETL (../scry/)

Files to create/modify:

1. **`src/sealed_product.rs`** - Module declaration
2. **`src/sealed_product/domain.rs`** - `SealedProduct` struct (uuid, name, set_code, category, subtype, card_count, product_size, release_date, contents_summary, purchase_url_tcgplayer)
3. **`src/sealed_product/mapper.rs`** - Map MTGJSON JSON -> SealedProduct, including:
   - Flatten `contents` to display string
   - Extract `purchaseUrls.tcgplayer`
   - Filter online-only products (name contains "MTGO" or "Arena")
4. **`src/sealed_product/repository.rs`** - UPSERT into `sealed_product` table
5. **`src/sealed_product/service.rs`** - Orchestrate fetch + map + save
6. **Hook into `Ingest` command** - Add `--sealed` flag, call sealed product ingestion during set ingestion
7. **Card purchase URLs** - During card ingestion, populate `purchase_url_tcgplayer` and `purchase_url_tcgplayer_etched`

Reference patterns: `src/set/` (domain, mapper, repository, service)

---

## Test Plan (TDD)

For each layer, write tests first:

- **Domain entities**: Test `validateInit` throws on missing required fields, accepts valid data
- **Service**: Mock repository port, test each service method delegates correctly (pattern: `test/core/set/set.service.spec.ts`)
- **API presenter**: Test domain -> DTO mapping
- **API controller**: Integration tests for sealed product endpoints
- **Scry mapper**: Test contents flattening, online-only filtering, field extraction

---

## Verification

1. Migration runs: `docker compose run --rm migrate`
2. Unit tests pass: `docker compose exec web npm test`
3. Integration tests pass: `npm run test:integ`
4. After ETL ingestion, sealed products appear in API responses
5. Set detail page shows sealed products section
6. Users can add/remove sealed products from inventory

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `docker/postgres/init/001_complete_schema.sql` | Add sealed product tables + card purchase URL columns |
| `src/database/database.module.ts` | Register ORM entities and port binding |
| `src/core/core.module.ts` | Import SealedProductModule |
| `src/http/api/api.module.ts` | Register API controllers |
| `src/http/hbs/hbs.module.ts` | Register view controller + orchestrator |
| `ROADMAP.md` | Reorder Phase 3 |
| `../scry/src/lib.rs` | Add `pub mod sealed_product;` |
| `../scry/src/cli/commands.rs` | Add `--sealed` flag to Ingest |
| `../scry/src/cli/controller.rs` | Wire sealed product ingestion |
