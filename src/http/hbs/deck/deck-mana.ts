// Mana helpers shared by the deck detail view: parse a mana-cost string into
// the token shape the manaCost.hbs partial renders, and roll a deck's mana
// costs up into the distinct colors it contains.
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { ManaToken } from 'src/http/hbs/card/dto/card.response.dto';

// WUBRG, the canonical color order; deck color pips render in this order.
const COLOR_ORDER = ['w', 'u', 'b', 'r', 'g'];

/** Parse "{2}{W}{U}" into mana tokens; handles split costs ("a // b") and half pips. */
export function parseManaTokens(manaCost?: string): ManaToken[] {
    if (!manaCost || typeof manaCost !== 'string') {
        return [];
    }
    const raw = manaCost.trim();
    if (raw === '') return [];
    const faceParts = raw.split(' // ');
    const tokens: ManaToken[] = [];
    for (let i = 0; i < faceParts.length; ++i) {
        const matches = Array.from(faceParts[i].trim().matchAll(/\{([^}]+)\}/g)).map((m) => m[1]);
        for (const sym of matches) {
            const lower = sym.toLowerCase().replace('/', '');
            if (lower.startsWith('h')) {
                tokens.push({ symbol: lower.substring(1), isHalf: true });
            } else {
                tokens.push({ symbol: lower });
            }
        }
        if (i + 1 < faceParts.length) {
            tokens.push({ sep: ' // ' });
        }
    }
    return tokens;
}

/** Distinct WUBRG colors present across all the deck's mana costs, in WUBRG order. */
export function deckColors(cards: DeckCard[]): string[] {
    const present = new Set<string>();
    for (const dc of cards) {
        const cost = dc.card?.manaCost;
        if (!cost) continue;
        const lower = cost.toLowerCase();
        for (const color of COLOR_ORDER) {
            if (lower.includes(color)) present.add(color);
        }
    }
    return COLOR_ORDER.filter((c) => present.has(c));
}
