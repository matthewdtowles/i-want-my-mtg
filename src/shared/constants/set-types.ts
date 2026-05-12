/**
 * Set types known to the application. Mirrors the values MTGJSON emits
 * for `Set.type` and matches the values stored in the `set.type` column.
 *
 * Used to validate user set-type preferences and to render the settings UI.
 */
export const KNOWN_SET_TYPES = [
    'expansion',
    'core',
    'draft_innovation',
    'masters',
    'funny',
    'commander',
    'duel_deck',
    'starter',
    'from_the_vault',
    'premium_deck',
    'planechase',
    'archenemy',
    'promo',
    'box',
    'masterpiece',
    'spellbook',
    'arsenal',
    'eternal',
    'memorabilia',
    'alchemy',
    'token',
] as const;

export type KnownSetType = (typeof KNOWN_SET_TYPES)[number];

const KNOWN_SET_TYPES_SET: ReadonlySet<string> = new Set(KNOWN_SET_TYPES);

export function isKnownSetType(value: string): value is KnownSetType {
    return KNOWN_SET_TYPES_SET.has(value);
}

/**
 * The implicit set-type list applied when a user has no custom preference
 * saved. Matches the result of `set.is_main = true` after the Phase 2
 * change in scry (`type IN ('expansion','core') AND parent_code IS NULL`).
 */
export const DEFAULT_INCLUDED_SET_TYPES: KnownSetType[] = ['expansion', 'core'];

/**
 * Set types shown in the primary checkbox group of the settings UI.
 * The rest live under an "Advanced" disclosure.
 */
export const PRIMARY_SET_TYPES_FOR_UI: KnownSetType[] = [
    'expansion',
    'core',
    'draft_innovation',
    'masters',
    'commander',
    'duel_deck',
    'funny',
    'starter',
];

export const ADVANCED_SET_TYPES_FOR_UI: KnownSetType[] = KNOWN_SET_TYPES.filter(
    (t) => !PRIMARY_SET_TYPES_FOR_UI.includes(t as KnownSetType)
) as KnownSetType[];
