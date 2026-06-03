import { BadRequestException } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { PUBLIC_RARITIES } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';

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
 * Each check mirrors the matching sanitizer (same casing rules) so a value the
 * API accepts is exactly a value `SafeQueryOptions` would keep, and vice versa.
 */

const ALLOWED_RARITIES: readonly string[] = [...PUBLIC_RARITIES];
const ALLOWED_FORMATS: readonly string[] = Object.values(Format);
const ALLOWED_LEGALITIES: readonly string[] = Object.values(LegalityStatus);
const ALLOWED_SORTS: readonly string[] = Object.values(SortOptions);
const ALLOWED_TRANSACTION_TYPES: readonly string[] = ['BUY', 'SELL'];

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
    sort?: boolean;
    rarity?: boolean;
    format?: boolean;
    legality?: boolean;
    setCode?: boolean;
    transactionType?: boolean;
}

function isAbsent(value: string | undefined): boolean {
    return value === undefined || value === null || value.trim() === '';
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
 * Throws `InvalidQueryParamException` on the first invalid filter value among
 * the enabled flags. Absent or empty values are treated as "not provided" and
 * skipped, matching the lenient sanitizer.
 */
export function validateApiQuery(
    query: Record<string, string | undefined>,
    flags: StrictQueryFlags
): void {
    if (flags.setCode && !isAbsent(query.setCode)) {
        const value = query.setCode.trim();
        if (!SET_CODE_PATTERN.test(value)) {
            throw new InvalidQueryParamException(
                'setCode',
                `Invalid value '${value}' for query parameter 'setCode'. Must contain only letters and digits.`
            );
        }
    }
    if (flags.sort && !isAbsent(query.sort) && !ALLOWED_SORTS.includes(query.sort)) {
        throw enumError('sort', query.sort, ALLOWED_SORTS);
    }
    if (
        flags.rarity &&
        !isAbsent(query.rarity) &&
        !ALLOWED_RARITIES.includes(query.rarity.toLowerCase())
    ) {
        throw enumError('rarity', query.rarity, ALLOWED_RARITIES);
    }
    if (
        flags.format &&
        !isAbsent(query.format) &&
        !ALLOWED_FORMATS.includes(query.format.toLowerCase())
    ) {
        throw enumError('format', query.format, ALLOWED_FORMATS);
    }
    if (
        flags.legality &&
        !isAbsent(query.legality) &&
        !ALLOWED_LEGALITIES.includes(query.legality.toLowerCase())
    ) {
        throw enumError('legality', query.legality, ALLOWED_LEGALITIES);
    }
    if (
        flags.transactionType &&
        !isAbsent(query.type) &&
        !ALLOWED_TRANSACTION_TYPES.includes(query.type.toUpperCase())
    ) {
        throw enumError('type', query.type, ALLOWED_TRANSACTION_TYPES);
    }
}
