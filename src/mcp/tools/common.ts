import { z } from 'zod';
import { Format } from 'src/core/card/format.enum';
import { McpToolAnnotations } from '../mcp-tool.types';

/**
 * Shared MCP tool annotation presets (behavior hints surfaced in `tools/list`).
 * `openWorldHint` is false everywhere - every tool operates on IWMM's own catalog
 * or the authenticated user's own data, not an open external world.
 */
export const READ_ONLY: McpToolAnnotations = { readOnlyHint: true, openWorldHint: false };
export const WRITE: McpToolAnnotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
};
/** Writes that converge to the same state when repeated (set quantity, update, mark-read). */
export const IDEMPOTENT_WRITE: McpToolAnnotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
};
/** Deletes - destructive, but repeating the delete is a no-op (idempotent). */
export const DESTRUCTIVE: McpToolAnnotations = {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
};

/** Described pagination params reused across every paginated list tool. */
export const pageParam = z.number().int().min(1).optional().describe('1-based page index. Defaults to 1.');
export const limitParam = z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Page size, 1-100. Server default applies if omitted.');

/**
 * Format-legality filter, enumerated so a typo is rejected rather than silently
 * dropped (matching the strict JSON API). Shared by search_cards + list_set_cards.
 */
export const formatParam = z
    .enum(Object.values(Format) as [string, ...string[]])
    .optional()
    .describe("Filter to cards with a legality entry in this format (e.g. 'modern', 'commander').");
