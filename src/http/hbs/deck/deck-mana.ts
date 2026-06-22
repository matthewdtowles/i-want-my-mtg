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

/** A deck color pip: the WUBRG symbol plus whether to render it small (minor color). */
export interface DeckColorPip {
    symbol: string;
    small: boolean;
}

// Colors below this share of the deck's colored cards render as a smaller pip,
// unless they're the most abundant color (or the deck's only color).
const MINOR_COLOR_THRESHOLD = 0.08;

/**
 * A deck's color pips ordered by how many cards of that color it contains
 * (most abundant first; WUBRG breaks ties). A color counts a card's `quantity`
 * for each WUBRG symbol in its mana cost, so a multicolor card counts toward
 * each of its colors. Minor colors (< 8% of the colored total) render small,
 * except the most abundant color and a single-color deck, which never do.
 */
export function deckColorPips(cards: DeckCard[]): DeckColorPip[] {
    const weights = new Map<string, number>();
    for (const dc of cards) {
        const cost = dc.card?.manaCost;
        if (!cost) continue;
        const lower = cost.toLowerCase();
        for (const color of COLOR_ORDER) {
            if (lower.includes(color)) {
                weights.set(color, (weights.get(color) ?? 0) + dc.quantity);
            }
        }
    }
    if (weights.size === 0) return [];

    const total = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    const ordered = COLOR_ORDER.filter((c) => weights.has(c)).sort(
        (a, b) => weights.get(b)! - weights.get(a)!
    );
    const single = ordered.length === 1;
    return ordered.map((color, index) => ({
        symbol: color,
        small: !single && index !== 0 && weights.get(color)! / total < MINOR_COLOR_THRESHOLD,
    }));
}
