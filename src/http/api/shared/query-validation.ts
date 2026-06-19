import { BadRequestException } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { PUBLIC_RARITIES, safeFormat, safeRarity } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { TRANSACTION_TYPES, parseTransactionType } from 'src/core/transaction/transaction.entity';

/**
 * Strict query-param validation for the JSON API.
 *
 * The shared `SafeQueryOptions` sanitizer silently drops invalid filter values
 * (unknown rarity/format/legality/sort, malformed setCode) so that stale
 * browser bookmarks still render an HBS page. For programmatic API consumers a
 * silently-ignored filter is a footgun: they get unfiltered results and assume
 * the filter worked. This validator runs in front of `SafeQueryOptions` on the
 * API controllers only and returns 400 instead of falling back.
 *
 * To stay consistent with what the endpoint actually does, each check delegates
 * to the same canonical function the controller/sanitizer use rather than
 * re-deriving the rule: `safeRarity`/`safeFormat` for those filters and
 * `parseTransactionType` for `type` (so casing/trimming can't diverge). The
 * accepted-value lists come from the same source enums. Four checks are
 * deliberately stricter than the sanitizer, because the sanitizer's lenient
 * fallback is itself the footgun for an API consumer:
 *   - `setCode`: 400s a non-alphanumeric code the sanitizer would silently coerce;
 *   - `sort`: validated against the endpoint's honorable set (see StrictQueryFlags)
 *     rather than the global enum, so a sort the endpoint can't apply 400s instead
 *     of silently falling back to the default;
 *   - `legality`: 400s when `format` is absent, since legality is only applied
 *     within a format join and would otherwise be silently ignored;
 *   - a repeated param parsed as an array (`?x=a&x=b`) 400s instead of throwing.
 */

// Accepted values per enumerated filter, derived from the source enums. Exported
// so the controllers' OpenAPI `@ApiQuery` enums document the same lists the
// validator enforces (no hand-maintained duplicate to drift out of sync).
export const RARITY_VALUES: readonly string[] = [...PUBLIC_RARITIES];
export const FORMAT_VALUES: readonly string[] = Object.values(Format);
export const LEGALITY_VALUES: readonly string[] = Object.values(LegalityStatus);
// The only supported `groupBy` mode. Validated exact (case-sensitive) so it
// stays in lockstep with the controller's `query.groupBy === 'name'` check - a
// typo'd value 400s instead of silently returning the per-printing default.
export const GROUP_BY_VALUES: readonly string[] = ['name'];

const SET_CODE_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * 400 raised when an API filter value is present but invalid. Carries the
 * offending param and (for enumerated filters) the accepted values so the
 * exception filter can surface them in the response body.
 */
export class InvalidQueryParamException extends BadRequestException {
    readonly param: string;
    readonly allowedValues?: readonly string[];

    constructor(param: string, message: string, allowedValues?: readonly string[]) {
        super(message);
        this.param = param;
        this.allowedValues = allowedValues;
    }
}

/** Which filters an endpoint actually consumes, and so should strictly validate. */
export interface StrictQueryFlags {
    /**
     * The sort keys this endpoint can honor (its repository's allowed set). A
     * sort outside it 400s rather than silently falling back to the default.
     * Omit for endpoints that don't sort (e.g. card search orders by name).
     */
    sort?: readonly SortOptions[];
    rarity?: boolean;
    format?: boolean;
    legality?: boolean;
    setCode?: boolean;
    transactionType?: boolean;
    /** Validate `groupBy` against {@link GROUP_BY_VALUES} (exact, single value). */
    groupBy?: boolean;
}

/**
 * Reads one query param as a present, non-empty string. Returns undefined for an
 * absent/empty value (skipped, matching the lenient sanitizer). Throws 400 for a
 * non-string value - a repeated param (`?x=a&x=b`) that Express parsed as an
 * array - rather than letting a later `.trim()`/`.toLowerCase()` throw a 500.
 */
function readParam(query: Record<string, unknown>, key: string): string | undefined {
    const value = query[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
        throw new InvalidQueryParamException(
            key,
            `Query parameter '${key}' must be a single value, not a list.`
        );
    }
    return value.trim() === '' ? undefined : value;
}

function enumError(
    param: string,
    value: string,
    allowed: readonly string[]
): InvalidQueryParamException {
    return new InvalidQueryParamException(
        param,
        `Invalid value '${value}' for query parameter '${param}'. Allowed values: ${allowed.join(', ')}.`,
        allowed
    );
}

/**
 * Throws `InvalidQueryParamException` on the first invalid filter value among the
 * enabled flags. Absent or empty values are skipped, matching the lenient sanitizer.
 */
export function validateApiQuery(query: Record<string, unknown>, flags: StrictQueryFlags): void {
    if (flags.setCode) {
        const value = readParam(query, 'setCode');
        if (value !== undefined && !SET_CODE_PATTERN.test(value.trim())) {
            throw new InvalidQueryParamException(
                'setCode',
                `Invalid value '${value.trim()}' for query parameter 'setCode'. Must contain only letters and digits.`
            );
        }
    }
    if (flags.sort) {
        const value = readParam(query, 'sort');
        if (value !== undefined && !flags.sort.includes(value as SortOptions)) {
            throw enumError('sort', value, flags.sort);
        }
    }
    if (flags.rarity) {
        const value = readParam(query, 'rarity');
        if (value !== undefined && safeRarity(value) === undefined) {
            throw enumError('rarity', value, RARITY_VALUES);
        }
    }
    if (flags.format) {
        const value = readParam(query, 'format');
        if (value !== undefined && safeFormat(value) === undefined) {
            throw enumError('format', value, FORMAT_VALUES);
        }
    }
    if (flags.legality) {
        const value = readParam(query, 'legality');
        if (value !== undefined) {
            if (!LEGALITY_VALUES.includes(value.toLowerCase())) {
                throw enumError('legality', value, LEGALITY_VALUES);
            }
            // legality is only applied within a format join, so legality alone is
            // a silently-ignored filter - 400 instead of dropping it.
            if (readParam(query, 'format') === undefined) {
                throw new InvalidQueryParamException(
                    'legality',
                    "Query parameter 'legality' requires 'format' to be set; legality is only meaningful within a format."
                );
            }
        }
    }
    if (flags.transactionType) {
        const value = readParam(query, 'type');
        if (value !== undefined && parseTransactionType(value) === undefined) {
            throw enumError('type', value, TRANSACTION_TYPES);
        }
    }
    if (flags.groupBy) {
        const value = readParam(query, 'groupBy');
        if (value !== undefined && !GROUP_BY_VALUES.includes(value)) {
            throw enumError('groupBy', value, GROUP_BY_VALUES);
        }
    }
}
