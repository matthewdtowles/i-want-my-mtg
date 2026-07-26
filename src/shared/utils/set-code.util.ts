/**
 * Set codes are stored lowercase, and the repository lookups that take one are
 * case-sensitive equality checks. Normalize before querying so a caller passing
 * the conventional uppercase form ("MKM") — or a code with stray whitespace —
 * finds the set instead of silently getting nothing back.
 *
 * Applied in the service layer so every caller (REST, MCP, HBS) is covered at
 * one point rather than each entry point remembering to do it.
 */
export function normalizeSetCode(code: string): string {
    return code?.trim().toLowerCase();
}
