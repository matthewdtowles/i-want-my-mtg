import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { DomainNotFoundError, DomainValidationError } from 'src/core/errors/domain.errors';
import { McpToolRegistry } from 'src/mcp/tools/registry';
import { CardMcpTools } from 'src/mcp/tools/cards.tools';
import { SetMcpTools } from 'src/mcp/tools/sets.tools';
import { InventoryMcpTools } from 'src/mcp/tools/inventory.tools';
import { TransactionMcpTools } from 'src/mcp/tools/transactions.tools';
import { PortfolioMcpTools } from 'src/mcp/tools/portfolio.tools';
import { AlertMcpTools } from 'src/mcp/tools/alerts.tools';
import { NotificationMcpTools } from 'src/mcp/tools/notifications.tools';
import { toMcpErrorText } from 'src/mcp/mcp.error';
import { outputSchemaByName } from 'src/mcp/tools/output-schemas';

// getTools() only declares the contract (name/description/schema/flags); it never
// touches the injected services, so stub them with `null` for these contract tests.
const stub = null as never;

function buildRegistry(): McpToolRegistry {
    return new McpToolRegistry(
        new CardMcpTools(stub),
        new SetMcpTools(stub, stub, stub, stub, stub),
        new InventoryMcpTools(stub),
        new TransactionMcpTools(stub, stub, stub),
        new PortfolioMcpTools(stub, stub, stub, stub, stub, stub),
        new AlertMcpTools(stub),
        new NotificationMcpTools(stub)
    );
}

const EXPECTED_NAMES = [
    // read-only
    'search_cards',
    'get_card',
    'get_card_prices',
    'get_card_price_history',
    'search_sets',
    'get_set',
    'list_set_cards',
    'get_sealed_products',
    // inventory
    'list_inventory',
    'get_inventory_quantities',
    'add_inventory',
    'update_inventory',
    'remove_inventory',
    // transactions
    'list_transactions',
    'record_transaction',
    'update_transaction',
    'delete_transaction',
    'get_cost_basis',
    // portfolio
    'get_portfolio_summary',
    'get_portfolio_history',
    'get_card_performance',
    'get_cash_flow',
    'get_realized_gains',
    'get_portfolio_breakdown',
    'refresh_portfolio',
    // alerts
    'list_price_alerts',
    'create_price_alert',
    'update_price_alert',
    'delete_price_alert',
    // notifications
    'list_notifications',
    'get_unread_notification_count',
    'mark_notification_read',
    'mark_all_notifications_read',
];

const READ_ONLY = new Set([
    'search_cards',
    'get_card',
    'get_card_prices',
    'get_card_price_history',
    'search_sets',
    'get_set',
    'list_set_cards',
    'get_sealed_products',
]);

const PREMIUM = new Set([
    'get_portfolio_history',
    'get_cash_flow',
    'get_realized_gains',
    'get_portfolio_breakdown',
]);

const DESTRUCTIVE = new Set(['remove_inventory', 'delete_transaction', 'delete_price_alert']);

describe('McpToolRegistry', () => {
    const registry = buildRegistry();
    const tools = registry.list();

    it('exposes exactly 33 tools in the documented order', () => {
        expect(tools).toHaveLength(33);
        expect(tools.map((t) => t.name)).toEqual(EXPECTED_NAMES);
    });

    it('uses snake_case names with no duplicates', () => {
        const names = tools.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
        for (const name of names) {
            expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
        }
    });

    it('gives every tool a non-empty description', () => {
        for (const tool of tools) {
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(10);
        }
    });

    it('marks only the catalog tools as anonymous (requiresAuth=false)', () => {
        for (const tool of tools) {
            expect(tool.requiresAuth).toBe(!READ_ONLY.has(tool.name));
        }
    });

    it('flags premium only on the tools the REST controller gates', () => {
        for (const tool of tools) {
            expect(!!tool.premium).toBe(PREMIUM.has(tool.name));
        }
    });

    it('converts every input schema to a JSON-Schema object', () => {
        for (const tool of tools) {
            const schema = zodToJsonSchema(tool.inputSchema as never, { target: 'openApi3' }) as {
                type?: string;
            };
            expect(schema.type).toBe('object');
        }
    });

    it('annotates every tool with closed-world behavior hints', () => {
        for (const tool of tools) {
            expect(tool.annotations).toBeDefined();
            expect(tool.annotations!.openWorldHint).toBe(false);
        }
    });

    it('marks catalog reads read-only and flags destructiveHint only on deletes', () => {
        for (const tool of tools) {
            if (READ_ONLY.has(tool.name)) {
                expect(tool.annotations!.readOnlyHint).toBe(true);
            }
            expect(!!tool.annotations!.destructiveHint).toBe(DESTRUCTIVE.has(tool.name));
        }
    });

    it('provides an output schema for every tool and no orphan schemas', () => {
        const toolNames = new Set(tools.map((t) => t.name));
        for (const tool of tools) {
            expect(outputSchemaByName[tool.name]).toBeDefined();
        }
        expect(Object.keys(outputSchemaByName).every((name) => toolNames.has(name))).toBe(true);
    });

    it('converts every output schema to a JSON-Schema object', () => {
        for (const tool of tools) {
            const schema = zodToJsonSchema(outputSchemaByName[tool.name] as never, {
                target: 'openApi3',
            }) as { type?: string };
            expect(schema.type).toBe('object');
        }
    });

    it('resolves tools by name and returns undefined for unknown names', () => {
        expect(registry.get('search_cards')?.name).toBe('search_cards');
        expect(registry.get('nope')).toBeUndefined();
    });
});

describe('toMcpErrorText', () => {
    it('maps 401 to an API-key prompt', () => {
        expect(toMcpErrorText(new UnauthorizedException('API key required'))).toMatch(
            /iwm_live_.*api-keys/i
        );
    });

    it('maps 403 to a Premium upgrade prompt', () => {
        const text = toMcpErrorText(new ForbiddenException('Active subscription required.'));
        expect(text).toMatch(/Premium/);
        expect(text).toMatch(/pricing/);
    });

    it('maps 429 to a rate-limit message', () => {
        const text = toMcpErrorText(new HttpException('Daily quota exceeded', 429));
        expect(text).toMatch(/Rate limit exceeded/);
    });

    it('passes domain error messages through verbatim', () => {
        expect(toMcpErrorText(new DomainNotFoundError('Card not found'))).toBe('Card not found');
        expect(toMcpErrorText(new DomainValidationError('bad threshold'))).toBe('bad threshold');
    });
});
