import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    CallToolRequestSchema,
    CallToolResult,
    ListToolsRequestSchema,
    ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { McpToolDefinition, McpUser } from './mcp-tool.types';
import { toMcpErrorText } from './mcp.error';
import { outputSchemaByName } from './tools/output-schemas';
import { McpToolRegistry } from './tools/registry';

const SERVER_NAME = 'iwantmymtg-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Builds a fresh MCP `Server` per request, closing over the authenticated user
 * resolved by the route guard. Tool execution reuses the same core services as
 * the REST API; auth and premium gating are enforced here per-tool, mirroring
 * the guards the REST controllers apply.
 */
@Injectable()
export class McpServerFactory {
    constructor(
        private readonly registry: McpToolRegistry,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {}

    build(user?: McpUser): Server {
        const server = new Server(
            { name: SERVER_NAME, version: SERVER_VERSION },
            { capabilities: { tools: {} } }
        );

        server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
            const tools = this.registry.list().map((t) => {
                // Cast schemas to `never` so zod-to-json-schema doesn't recurse the
                // union of every tool's zod type (TS2589); the runtime output is the
                // JSON Schema object MCP clients expect.
                const tool: Record<string, unknown> = {
                    name: t.name,
                    description: t.description,
                    inputSchema: zodToJsonSchema(t.inputSchema as never, { target: 'openApi3' }),
                };
                const outputSchema = t.outputSchema ?? outputSchemaByName[t.name];
                if (outputSchema) {
                    tool.outputSchema = zodToJsonSchema(outputSchema as never, {
                        target: 'openApi3',
                    });
                }
                if (t.annotations) {
                    tool.annotations = t.annotations;
                }
                return tool;
            });
            return { tools } as ListToolsResult;
        });

        server.setRequestHandler(CallToolRequestSchema, async (req): Promise<CallToolResult> => {
            const tool = this.registry.get(req.params.name);
            if (!tool) {
                return this.errorResult(`Unknown tool: ${req.params.name}`);
            }

            const parsed = tool.inputSchema.safeParse(req.params.arguments ?? {});
            if (!parsed.success) {
                return this.errorResult(
                    `Invalid arguments for ${tool.name}: ${parsed.error.message}`
                );
            }

            try {
                await this.enforce(tool, user);
                const result = await tool.handler(parsed.data, { user });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (err) {
                return this.errorResult(toMcpErrorText(err));
            }
        });

        return server;
    }

    /** Mirror the REST guards: API key required for auth tools, active sub for premium tools. */
    private async enforce(tool: McpToolDefinition, user?: McpUser): Promise<void> {
        if (tool.requiresAuth && !user?.id) {
            throw new UnauthorizedException('API key required');
        }
        if (tool.premium && !(await this.subscriptionService.isUserSubscribed(user.id))) {
            throw new ForbiddenException('Active subscription required.');
        }
    }

    private errorResult(text: string): CallToolResult {
        return { isError: true, content: [{ type: 'text', text }] };
    }
}
