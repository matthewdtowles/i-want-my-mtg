import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

export interface ToggleConfig {
    effectiveOptions: SafeQueryOptions;
    targetMaxPage: number;
    visible: boolean;
}

/**
 * Builds toggle configuration for list views.
 *
 * @param options - Current query options
 * @param currentCount - Count for current baseOnly state
 * @param targetCount - Count for toggled baseOnly state
 * @param forceShowAll - If true, forces baseOnly to false (e.g., when baseSize is 0)
 */
export function buildToggleConfig(
    options: SafeQueryOptions,
    currentCount: number,
    targetCount: number,
    forceShowAll: boolean = false
): ToggleConfig {
    const effectiveOptions = forceShowAll
        ? new SafeQueryOptions({
            baseOnly: 'false',
            page: String(options.page),
            limit: String(options.limit),
            ...(options.ascend !== undefined && { ascend: String(options.ascend) }),
            ...(options.filter && { filter: options.filter }),
            ...(options.sort && { sort: String(options.sort) }),
        })
        : options;

    const targetMaxPage = Math.max(1, Math.ceil(targetCount / effectiveOptions.limit));
    const visible = !forceShowAll && currentCount !== targetCount && targetCount > 0;

    return {
        effectiveOptions,
        targetMaxPage,
        visible,
    };
}
