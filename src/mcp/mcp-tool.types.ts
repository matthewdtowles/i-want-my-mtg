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
 * MCP tool behavior hints (a subset of the spec's `ToolAnnotations`). Surfaced in
 * `tools/list` so clients - and Smithery's quality scan - can reason about a tool
 * without calling it. `openWorldHint` is false for every tool here: they operate on
 * IWMM's own catalog and the user's own data, not an open external world.
 */
export interface McpToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}

/**
 * A single MCP tool. `name`, `description`, `inputSchema`, `outputSchema`, and
 * `annotations` form the contract Smithery scans (kept in step with the
 * `iwantmymtg-mcp` stdio server). The handler reuses the same core services +
 * presenters as the matching REST twin.
 */
export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: z.ZodTypeAny;
    /** Zod schema for the tool's result envelope; converted to JSON Schema in the server factory for `tools/list`. */
    outputSchema?: z.ZodTypeAny;
    /** Behavior hints (read-only / destructive / idempotent) surfaced in `tools/list`. */
    annotations?: McpToolAnnotations;
    /** When true, the call is rejected with an auth error if no user is present. */
    requiresAuth: boolean;
    /** When true, the call is rejected unless the user has an active subscription. */
    premium?: boolean;
    handler: (args: any, ctx: McpToolContext) => Promise<unknown>;
}
