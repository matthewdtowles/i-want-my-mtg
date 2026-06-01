import { Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Response } from 'express';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';
import { OptionalAuthOrApiKeyGuard } from 'src/http/api/shared/optional-auth-or-api-key.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { McpServerFactory } from './mcp-server.factory';

/**
 * Streamable-HTTP MCP endpoint. A driving adapter over the same core services
 * as the REST API, exposed so MCP clients (and Smithery's tools/list scan) can
 * reach the tool surface over the wire at POST /mcp.
 *
 * Stateless transport: a fresh server + transport per request (no sessions), so
 * GET/DELETE have no session to act on and return 405.
 */
@ApiExcludeController()
@Controller('mcp')
export class McpController {
    constructor(private readonly serverFactory: McpServerFactory) {}

    @Post()
    @UseGuards(OptionalAuthOrApiKeyGuard, ApiRateLimitGuard)
    async handleRpc(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        // Reject JSON-RPC batch arrays: the rate limiter counts one POST as one
        // operation, so a batch would let N tool calls run under a single tick.
        // The 2025-06-18 MCP spec also drops batching, so single requests only.
        if (Array.isArray(req.body)) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32600,
                    message: 'Batch requests are not supported. Send one JSON-RPC request per call.',
                },
                id: null,
            });
            return;
        }

        const server = this.serverFactory.build(req.user ?? undefined);
        // Stateless: no sessions, and respond with a single JSON-RPC body (not SSE)
        // so Smithery's scan and plain HTTP clients get application/json back.
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });

        let cleanedUp = false;
        const cleanup = (): void => {
            if (cleanedUp) return;
            cleanedUp = true;
            void transport.close();
            void server.close();
        };
        // 'finish' fires once the response is fully sent (the common path); 'close'
        // covers connections aborted before finish. With keep-alive, 'close' alone
        // can lag well past the response, leaving the per-request server/transport
        // alive longer than needed under load.
        res.on('finish', cleanup);
        res.on('close', cleanup);

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }

    @Get()
    methodNotAllowedGet(@Res() res: Response): void {
        this.methodNotAllowed(res);
    }

    @Delete()
    methodNotAllowedDelete(@Res() res: Response): void {
        this.methodNotAllowed(res);
    }

    private methodNotAllowed(res: Response): void {
        res.status(405).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Method not allowed. Use POST for MCP streamable HTTP.',
            },
            id: null,
        });
    }
}
