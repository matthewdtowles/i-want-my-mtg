// Shared maindeck type-grouping used by the user-deck and published-deck pages.
export const TYPE_ORDER = [
    'Creature',
    'Planeswalker',
    'Instant',
    'Sorcery',
    'Artifact',
    'Enchantment',
    'Battle',
    'Land',
];

export const TYPE_PLURAL: Record<string, string> = {
    Creature: 'Creatures',
    Planeswalker: 'Planeswalkers',
    Instant: 'Instants',
    Sorcery: 'Sorceries',
    Artifact: 'Artifacts',
    Enchantment: 'Enchantments',
    Battle: 'Battles',
    Land: 'Lands',
    Other: 'Other',
};

/** A card's primary type bucket, in deckbuilder display order. */
export function primaryType(typeLine: string): string {
    // MTGJSON type lines use an em dash (U+2014) before subtypes; take the head.
    const head = (typeLine ?? '').split(String.fromCharCode(0x2014))[0];
    return TYPE_ORDER.find((t) => head.includes(t)) ?? 'Other';
}
