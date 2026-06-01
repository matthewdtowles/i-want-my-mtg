import { z } from 'zod';

/**
 * The authenticated user a tool handler operates on, mirroring the subset of
 * `AuthenticatedRequest.user` the REST controllers read. API-key auth populates
 * only `id`; JWT-cookie auth carries the full user (incl. `includedSetTypes`).
 */
export interface McpUser {
    id: number;
    includedSetTypes?: string[] | null;
}

export interface McpToolContext {
    /** Present when a valid API key / JWT was supplied; undefined for anonymous reads. */
    user?: McpUser;
}

/**
 * A single MCP tool. `name`, `description`, and `inputSchema` form the contract
 * Smithery scans (copied verbatim from the `iwantmymtg-mcp` stdio server). The
 * handler reuses the same core services + presenters as the matching REST twin.
 */
export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny;
    /** When true, the call is rejected with an auth error if no user is present. */
    requiresAuth: boolean;
    /** When true, the call is rejected unless the user has an active subscription. */
    premium?: boolean;
    handler: (args: any, ctx: McpToolContext) => Promise<unknown>;
}
