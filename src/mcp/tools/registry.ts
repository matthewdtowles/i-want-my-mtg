import { Injectable } from '@nestjs/common';
import { McpToolDefinition } from '../mcp-tool.types';
import { AlertMcpTools } from './alerts.tools';
import { CardMcpTools } from './cards.tools';
import { InventoryMcpTools } from './inventory.tools';
import { NotificationMcpTools } from './notifications.tools';
import { PortfolioMcpTools } from './portfolio.tools';
import { SetMcpTools } from './sets.tools';
import { TransactionMcpTools } from './transactions.tools';

/**
 * Aggregates every domain tool provider into the flat list the MCP server
 * exposes. Order mirrors `iwantmymtg-mcp/src/tools/index.ts` so `tools/list`
 * output is stable across the stdio and in-app servers.
 */
@Injectable()
export class McpToolRegistry {
    private readonly tools: McpToolDefinition[];
    private readonly byName: Map<string, McpToolDefinition>;

    constructor(
        cards: CardMcpTools,
        sets: SetMcpTools,
        inventory: InventoryMcpTools,
        transactions: TransactionMcpTools,
        portfolio: PortfolioMcpTools,
        alerts: AlertMcpTools,
        notifications: NotificationMcpTools
    ) {
        this.tools = [
            ...cards.getTools(),
            ...sets.getTools(),
            ...inventory.getTools(),
            ...transactions.getTools(),
            ...portfolio.getTools(),
            ...alerts.getTools(),
            ...notifications.getTools(),
        ];
        this.byName = new Map(this.tools.map((t) => [t.name, t]));
    }

    list(): McpToolDefinition[] {
        return [...this.tools];
    }

    get(name: string): McpToolDefinition | undefined {
        return this.byName.get(name);
    }
}
