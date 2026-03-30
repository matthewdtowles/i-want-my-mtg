# Playwright E2E Test Plan

## 1. Install & Configure

**Dependencies:**
```bash
npm install -D @playwright/test
npx playwright install chromium   # only Chromium needed initially
```

**Config file:** `playwright.config.ts` at project root
- Base URL: `http://localhost:3000`
- Test directory: `test/e2e/`
- File pattern: `*.e2e.ts`
- Single project (Chromium desktop) to start; add Firefox/WebKit/mobile later
- `webServer` block to auto-start the app before tests (or rely on Docker — see step 3)
- Retries: 0 locally, 2 in CI
- Screenshot on failure, trace on first-retry

## 2. Test Infrastructure

**`test/e2e/` directory structure:**
```
test/e2e/
  fixtures/          # Shared setup: authenticated page, test constants
    auth.fixture.ts  # Custom fixture that logs in and provides an authenticated Page
  public.e2e.ts      # Unauthenticated page tests
  auth.e2e.ts        # Login/logout/register flows
  sets.e2e.ts        # Set list + set detail binder
  inventory.e2e.ts   # Inventory management (authenticated)
  search.e2e.ts      # Search suggest + results
  portfolio.e2e.ts   # Portfolio page (authenticated)
  transactions.e2e.ts # Transaction CRUD (authenticated)
```

**Auth fixture** — Playwright's `test.extend()` to provide a pre-authenticated `Page`:
- Logs in via `POST /auth/login` (or navigates to `/auth/login` and fills the form)
- Stores the `authorization` cookie in a `storageState` JSON file
- Subsequent tests reuse the storage state (fast, no repeated logins)
- Uses existing test user: `integ@test.com` / `TestPass1!`

## 3. App Lifecycle for Tests

**Option A (recommended): Docker-based, mirrors integration tests**
- Create `scripts/test-e2e-playwright.sh` modeled on `scripts/test-integ.sh`
- Starts `postgres-test` on port 5433 (reuse `docker-compose.test.yml`)
- Runs schema init + migrations + seed (same 22 migration files + `test/integration/seed.sql`)
- Starts the NestJS app against the test DB on port 3000 (foreground, wait for healthy)
- Runs `npx playwright test`
- Tears down app + DB on exit

**Option B: Playwright `webServer` config**
- `playwright.config.ts` includes a `webServer` block that runs `npm run start:dev` with test env vars
- Simpler but slower (watch mode overhead) and less isolated

Go with **Option A** for consistency with existing test patterns.

## 4. Test Seed Data

Reuse the existing `test/integration/seed.sql` — it already has:
- Test set `TST` with 3 cards (Angel, Sphinx, Zombie)
- Prices and price history
- Two test users (`integ@test.com`, `mutation@test.com`)
- Legalities, set prices

No additional seed data needed for an initial test suite.

## 5. Initial Test Suites

**Priority 1 — Public pages (no auth):**
| Test | What it verifies |
|---|---|
| Home page loads | `GET /` → title, key elements render |
| Sets page loads | `GET /sets` → set list renders, TST set visible |
| Set detail / binder | `GET /sets/TST` → 3 cards render in binder grid |
| Card detail | `GET /card/TST/1` → card name, price, image visible |
| Search | `GET /search?q=Angel` → results contain "Test Angel" |

**Priority 2 — Auth flows:**
| Test | What it verifies |
|---|---|
| Login success | Fill form → redirected to `/` with cookie set |
| Login failure | Wrong password → error message shown |
| Logout | Click logout → cookie cleared, redirected to login |

**Priority 3 — Authenticated features (use auth fixture):**
| Test | What it verifies |
|---|---|
| Binder quantity stepper | On `/sets/TST`, increment card quantity → API call fires, UI updates |
| Inventory page | `/inventory` → owned cards listed |
| Portfolio page | `/portfolio` → value summary renders |
| Transactions page | `/transactions` → transaction list renders |

## 6. npm Scripts

```json
"test:e2e:pw": "npx playwright test",
"test:e2e:pw:ui": "npx playwright test --ui",
"test:e2e:pw:headed": "npx playwright test --headed",
"test:e2e:pw:report": "npx playwright show-report"
```

Full lifecycle script: `npm run test:playwright` → calls `scripts/test-e2e-playwright.sh`

## 7. CI Integration

Add a new job to `.github/workflows/deploy.yml` after the existing `integration-test` job:

```yaml
playwright-test:
  runs-on: ubuntu-latest
  needs: [test]
  services:
    postgres:
      image: postgres:18-alpine
      ports: ['5433:5432']
      env:
        POSTGRES_USER: testuser
        POSTGRES_PASSWORD: testpass
        POSTGRES_DB: iwantmymtg_test
      options: --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - run: # schema + migrations + seed (same as integration-test job)
    - run: npm run build:prod
    - run: node dist/main &  # start app in background
    - run: npx playwright test
    - uses: actions/upload-artifact@v4  # upload HTML report + traces on failure
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

## 8. .gitignore Additions

```
playwright-report/
test-results/
test/e2e/.auth/       # storageState files
```

## 9. Implementation Order

1. Install Playwright, create `playwright.config.ts`
2. Create auth fixture (`test/e2e/fixtures/auth.fixture.ts`)
3. Create `scripts/test-e2e-playwright.sh`
4. Write Priority 1 tests (public pages) — validates the whole setup works
5. Write Priority 2 tests (auth flows)
6. Write Priority 3 tests (authenticated features, binder interaction)
7. Add npm scripts to `package.json`
8. Add CI job to deploy workflow
9. Update `.gitignore`
