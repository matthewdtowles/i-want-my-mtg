import { test as authTest, expect } from './fixtures/auth.fixture';
import { test, type Page } from '@playwright/test';

/**
 * Regression gate for horizontal overflow / warping (Roadmap 6.3.1, Part C).
 *
 * Visits representative pages at narrow mobile widths and asserts the page
 * never scrolls horizontally. When it does, the DOM walk names the offending
 * element so the failure points at the cause instead of "something leaked".
 *
 * Containers that are intentionally scrollable (the responsive table wrapper)
 * and chart canvases are whitelisted — their content legitimately exceeds the
 * viewport and is clipped/scrolled, not warping the page.
 */
const WIDTHS = [320, 375] as const;
const HEIGHT = 800;
const OVERFLOW_WHITELIST = ['.table-wrapper', 'canvas'];

interface Offender {
    selector: string;
    right: number;
    docWidth: number;
}

/**
 * Diagnostic only — runs after we already know the page overflows, to name the
 * likely culprits in the failure message. Skips `position: fixed` subtrees
 * (off-canvas drawers, sticky bars) since those don't grow the document's
 * scroll width, and the whitelisted scroll containers.
 */
async function findOverflowOffenders(page: Page, whitelist: string[]): Promise<Offender[]> {
    return page.evaluate((whitelistSelectors) => {
        const docWidth = document.documentElement.clientWidth;
        const isInFixed = (el: HTMLElement): boolean => {
            let node: HTMLElement | null = el;
            while (node && node !== document.body) {
                if (getComputedStyle(node).position === 'fixed') return true;
                node = node.parentElement;
            }
            return false;
        };
        const offenders: Offender[] = [];
        const elements = document.body.querySelectorAll<HTMLElement>('*');
        for (const el of Array.from(elements)) {
            if (whitelistSelectors.some((sel) => el.closest(sel))) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (rect.right <= docWidth + 1 && rect.left >= -1) continue;
            if (isInFixed(el)) continue;
            const id = el.id ? `#${el.id}` : '';
            const cls =
                typeof el.className === 'string' && el.className.trim()
                    ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
                    : '';
            offenders.push({
                selector: `${el.tagName.toLowerCase()}${id}${cls}`,
                right: Math.round(rect.right),
                docWidth,
            });
        }
        return offenders;
    }, whitelist) as Promise<Offender[]>;
}

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
    }));
    const limit = innerWidth + 1;

    let message = `Page scrolls horizontally on ${label}: scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`;
    if (scrollWidth > limit) {
        const offenders = await findOverflowOffenders(page, OVERFLOW_WHITELIST);
        if (offenders.length) {
            message +=
                '\nLikely culprits:\n' +
                offenders
                    .map((o) => `  ${o.selector} (right=${o.right} > viewport=${o.docWidth})`)
                    .join('\n');
        }
    }
    expect(scrollWidth, message).toBeLessThanOrEqual(limit);
}

async function resolveSetHref(page: Page): Promise<string> {
    await page.goto('/sets');
    return (await page.locator('.table-row a').first().getAttribute('href'))!;
}

async function resolveCardHref(page: Page, setHref: string): Promise<string> {
    await page.goto(setHref);
    const cardLink = page.locator('#set-card-list-ajax a[href^="/card/"]').first();
    await cardLink.waitFor();
    return (await cardLink.getAttribute('href'))!;
}

test.describe('Responsive overflow guard (public)', () => {
    for (const width of WIDTHS) {
        test(`no horizontal overflow at ${width}px across public pages`, async ({ page }) => {
            await page.setViewportSize({ width, height: HEIGHT });

            const setHref = await resolveSetHref(page);
            const cardHref = await resolveCardHref(page, setHref);

            const pages: Array<{ url: string; label: string }> = [
                { url: '/', label: 'home' },
                { url: '/sets', label: 'sets' },
                { url: setHref, label: 'set detail' },
                { url: cardHref, label: 'card detail' },
                { url: '/search?q=Angel', label: 'search' },
                { url: '/pricing', label: 'pricing' },
            ];

            for (const { url, label } of pages) {
                await page.goto(url);
                await page.locator('main, body').first().waitFor();
                await assertNoHorizontalOverflow(page, `${label} @ ${width}px`);
            }
        });
    }
});

authTest.describe('Responsive overflow guard (authenticated)', () => {
    for (const width of WIDTHS) {
        authTest(
            `no horizontal overflow at ${width}px across authenticated pages`,
            async ({ authedPage: page }) => {
                await page.setViewportSize({ width, height: HEIGHT });

                const pages: Array<{ url: string; label: string }> = [
                    { url: '/inventory', label: 'inventory' },
                    { url: '/billing', label: 'billing' },
                ];

                for (const { url, label } of pages) {
                    await page.goto(url);
                    await page.locator('main, body').first().waitFor();
                    await assertNoHorizontalOverflow(page, `${label} @ ${width}px`);
                }
            }
        );
    }
});
