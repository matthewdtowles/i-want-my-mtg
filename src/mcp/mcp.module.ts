import { Module } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { CoreModule } from 'src/core/core.module';
import { ApiModule } from 'src/http/api/api.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { McpToolRegistry } from './tools/registry';
import { AlertMcpTools } from './tools/alerts.tools';
import { CardMcpTools } from './tools/cards.tools';
import { InventoryMcpTools } from './tools/inventory.tools';
import { NotificationMcpTools } from './tools/notifications.tools';
import { PortfolioMcpTools } from './tools/portfolio.tools';
import { SetMcpTools } from './tools/sets.tools';
import { TransactionMcpTools } from './tools/transactions.tools';

/**
 * MCP driving adapter. Reuses the core feature services (via CoreModule) and the
 * REST API's auth + rate-limit guards (exported by ApiModule) so the in-app MCP
 * endpoint inherits per-user auth, premium gating, and rate limits unchanged.
 */
@Module({
    imports: [CoreModule, ApiModule],
    controllers: [McpController],
    providers: [
        McpServerFactory,
        McpToolRegistry,
        CardMcpTools,
        SetMcpTools,
        InventoryMcpTools,
        TransactionMcpTools,
        PortfolioMcpTools,
        AlertMcpTools,
        NotificationMcpTools,
    ],
})
export class McpModule {
    private readonly LOGGER = getLogger(McpModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
