import { z } from 'zod';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { PUBLIC_RARITIES } from 'src/core/query/safe-query-options.dto';
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
export const pageParam = z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('1-based page index. Defaults to 1.');
export const limitParam = z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Page size, 1-100. Server default applies if omitted.');

// Card catalog filters, enumerated from the same source enums the JSON API uses
// so a typo is rejected rather than silently dropped, and the accepted values
// can't drift from the REST contract. Shared by search_cards + list_set_cards.
export const rarityParam = z
    .enum([...PUBLIC_RARITIES] as [string, ...string[]])
    .optional()
    .describe('Filter by rarity.');

export const formatParam = z
    .enum(Object.values(Format) as [string, ...string[]])
    .optional()
    .describe("Filter to cards with a legality entry in this format (e.g. 'modern', 'commander').");

export const legalityParam = z
    .enum(Object.values(LegalityStatus) as [string, ...string[]])
    .optional()
    .describe("Used with 'format'. Defaults to 'legal' when format is set.");

/**
 * Rejects `legality` without `format`. Legality is only applied within a format
 * join, so legality alone is a silently-ignored filter - the same combo the strict
 * JSON API (`validateApiQuery`) 400s. Wrap a card-filter object schema with this.
 */
export function refineLegalityRequiresFormat<T extends z.ZodTypeAny>(schema: T) {
    return schema.refine(
        (v: { format?: unknown; legality?: unknown }) => !(v.legality && !v.format),
        {
            message: 'legality requires format to be set; it is only applied within a format.',
            path: ['legality'],
        }
    );
}
