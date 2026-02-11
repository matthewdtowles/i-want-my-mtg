import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

export interface ToggleConfig {
    targetMaxPage: number;
    visible: boolean;
}

/**
 * Builds toggle configuration for list views.
 *
 * @param options - Current query options (caller must pre-apply forceShowAll if needed)
 * @param currentCount - Count for current baseOnly state
 * @param targetCount - Count for toggled baseOnly state
 * @param forceShowAll - If true, hides the toggle (e.g., when baseSize is 0)
 */
export function buildToggleConfig(
    options: SafeQueryOptions,
    currentCount: number,
    targetCount: number,
    forceShowAll: boolean = false
): ToggleConfig {
    const targetMaxPage = Math.max(1, Math.ceil(targetCount / options.limit));
    const visible = !forceShowAll && currentCount !== targetCount && targetCount > 0;

    return {
        targetMaxPage,
        visible,
    };
}
