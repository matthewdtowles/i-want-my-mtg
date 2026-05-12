# Phase 3 Implementation Spec - User-Controlled Set-Type Filter

**Goal:** let signed-in users choose which set types appear in browse / search / list views, with a sensible default for anonymous users. Removes the philosophical "is X a main set?" debate from the codebase and pushes it to user preference.

**Prerequisites:** Phase 1 and Phase 2 deployed. The `set.is_main` flag continues to exist and serves as the **default filter** for anonymous users and users who haven't customized their preferences.

---

## Concept

Today, several iwmm queries hard-code `WHERE set.is_main = true` for browse-style endpoints. Phase 3 replaces that with:

1. **If the request has an authenticated user with a saved set-type preference:** filter by `set.type = ANY(user.included_set_types)`.
2. **Otherwise:** filter by `set.is_main = true` (the Phase 2 default).

Net effect:
- Anonymous users keep the same experience as today.
- A new user gets the default-main experience until they customize.
- A Modern Horizons fan flips on `draft_innovation` and sees MH1/2/3 in their browse view.
- A Commander player flips on `commander` and sees all the precon decks.

---

## Data model

### New column on `user` table

```sql
ALTER TABLE "user" ADD COLUMN included_set_types text[] NULL;
```

Semantics:
- `NULL` -> user has not customized; fall back to `is_main = true`.
- `[]` (empty array) -> user has explicitly cleared all types; return empty set listings.
- `['expansion','core','draft_innovation']` -> use this list.

Why nullable instead of defaulting to `{expansion,core}`: it preserves the distinction between "never customized" (fall back to `is_main`) and "explicitly chose just expansion+core" (use the array). The fallback path is also what existing code uses today, so behavior is unchanged for users until they touch the setting.

### Migration file

`migrations/00NN_user_set_type_preferences.sql` - one ALTER TABLE statement plus rollback in a paired down migration if the project uses bidirectional migrations.

### TypeORM entity

`src/database/user/user.orm-entity.ts` - add the column:

```typescript
@Column({ name: 'included_set_types', type: 'text', array: true, nullable: true })
includedSetTypes: string[] | null;
```

Domain entity `src/core/user/user.entity.ts` - mirror the field, treat it as immutable like the rest of the entity.

---

## Backend - filter plumbing

### Where the filter applies

Every repository call that currently has `qb.andWhere(\`${this.TABLE}.isMain = :isMain\`, { isMain: true })`. Confirmed locations:

- `src/database/set/set.repository.ts` - lines 44, 60, 100, 117, 156 (5 separate query methods)

The `set.repository.ts:102` `orderBy` on `isMain` is presentation, not filtering - leave it alone.

### Repository signature change

Add an optional filter param to each affected query method. Existing callers passing nothing continue to get the `is_main = true` behavior.

```typescript
interface SetTypeFilter {
    types?: string[] | null;  // null/undefined -> fall back to is_main = true
}

// Before:
async findAllBrowse(): Promise<SetOrmEntity[]> {
    const qb = this.repository.createQueryBuilder(this.TABLE);
    qb.andWhere(`${this.TABLE}.isMain = :isMain`, { isMain: true });
    // ...
}

// After:
async findAllBrowse(filter?: SetTypeFilter): Promise<SetOrmEntity[]> {
    const qb = this.repository.createQueryBuilder(this.TABLE);
    this.applyTypeFilter(qb, filter);
    // ...
}

private applyTypeFilter(qb: SelectQueryBuilder<SetOrmEntity>, filter?: SetTypeFilter): void {
    if (filter?.types === undefined || filter.types === null) {
        qb.andWhere(`${this.TABLE}.isMain = :isMain`, { isMain: true });
        return;
    }
    if (filter.types.length === 0) {
        qb.andWhere('1 = 0');  // explicit empty
        return;
    }
    qb.andWhere(`${this.TABLE}.type = ANY(:types)`, { types: filter.types });
}
```

### Where the filter gets supplied

Trace from controller -> orchestrator -> service -> repository. The clean path:

- **Controller**: extract user from request (already done via `@CurrentUser`); pass to orchestrator.
- **Orchestrator**: read `user?.includedSetTypes`, pass as filter to service.
- **Service**: pass through to repository.

Controllers that already accept a user context need no signature change. Anonymous routes pass `undefined` and get the legacy behavior naturally.

### API response - new endpoint

Two endpoints on the user controller:

```
GET  /api/v1/user/preferences/set-types          -> { types: string[] | null, default: ['expansion','core'] }
PUT  /api/v1/user/preferences/set-types          -> body: { types: string[] | null }
```

The `default` field is for the UI to render checkbox state when the user hasn't customized yet.

Validation on PUT:
- `types` must be `null` OR an array of strings.
- Each string must be a known set type (validated against an enum of MTGJSON set types).
- Maximum 25 entries (defensive cap; there are only ~18 types in DB today).

---

## Frontend

### Settings page section

A new section in the user account / settings page. Suggested copy:

> **Which set types do you want to see?**
> Pick the types that show up in your browse and search views. Leave the default to see the same sets as everyone else.

Render as two tiers - a primary group of common types visible by default, and an "Advanced" disclosure for the long tail.

**Primary (visible)**:
- [x] Use the default set list (expansions and core sets only)
- [ ] Expansion
- [ ] Core
- [ ] Draft innovation (Modern Horizons, Commander Legends, ...)
- [ ] Masters (reprint sets)
- [ ] Commander decks
- [ ] Duel decks
- [ ] Un-sets (silly cards)
- [ ] Starter sets (Portal series)

**Advanced (collapsed by default)**:
- [ ] From the Vault
- [ ] Premium decks
- [ ] Planechase
- [ ] Archenemy
- [ ] Promo
- [ ] Box sets (Secret Lair, etc.)
- [ ] Masterpiece series
- [ ] Spellbook
- [ ] Arsenal
- [ ] Eternal
- [ ] Memorabilia
- [ ] Alchemy

Selecting "Use the default set list" submits `types: null`. Selecting one or more specific types submits the array (including any types selected from the Advanced section).

The Advanced section opens via a `<details>` disclosure or equivalent. Show a count of currently-selected Advanced types in the disclosure label when collapsed (e.g., "Advanced (2 selected)") so users don't lose track of selections that aren't visible.

Display the current behavior in a helper line: "Showing 142 sets" / "Showing 384 sets" so the user can see the impact of their choice before saving.

The validation list on the PUT endpoint must accept every set type that exists in the DB, not just the eight in the primary group - the Advanced types still need to round-trip correctly.

### Browse / search views

No UI change required. The filter is invisible to the user once their preference is saved.

Optional enhancement: a small "Filter: 5 set types selected" badge on the browse page header, click to open settings. Defer until after the basic feature ships.

---

## Caching considerations

Today set browse responses are likely globally cacheable (same response for everyone). After Phase 3:

- Anonymous responses are still globally cacheable (same `is_main = true` filter for everyone).
- Authenticated responses with a custom filter need per-user (or per-filter-set) caching.

Two strategies:

**A. Cache by filter content.** Compute a hash of the user's `includedSetTypes` and key the cache by that hash. Multiple users with the same selection share a cache entry. Most efficient if many users converge on similar selections (likely).

**B. Don't cache authenticated set browses.** Simpler, slightly more DB load. Probably fine until you have many active users.

Recommendation: **start with B**, add A only if you see real DB pressure. Browse queries on the `set` table are cheap.

---

## Migration of existing users

No data migration needed. All existing users get `included_set_types = NULL`, which falls back to `is_main = true` - identical to current behavior. They opt in by visiting the settings page.

---

## Test plan

- Unit: repository methods with `filter = undefined`, `filter = { types: null }`, `filter = { types: [] }`, `filter = { types: ['expansion','draft_innovation'] }`.
- Integration: end-to-end browse request with anonymous, with authenticated default-preferences user, with authenticated customized user.
- Frontend: settings page submits null and submits a non-empty array; browse view changes reflect the saved preference.
- E2E (Playwright): create a user, set preference, navigate to browse, verify expected sets appear and others don't.

---

## Sequencing

1. Migration adds the column. Deploy. Verify schema applied.
2. Backend changes: repository signatures, orchestrator wiring, new API endpoints. Deploy.
3. Frontend settings UI. Deploy.

Each step is independently shippable. Backend works without frontend; frontend depends on backend being live.

---

## Out of scope

- Card-level filtering by `inMain` based on user preference (a different feature - inventory display options).
- Per-set "exclude this specific set" overrides (over-engineering for now).
- Renaming or deprecating the `isMain` API field. Keep its current semantics (default-main-set flag). Document on the API endpoint that this reflects the default filter, not the user's filter.
- Public API consumers (RapidAPI) seeing user-filtered results. They don't have authenticated users in the same sense; they always get the anonymous default.

