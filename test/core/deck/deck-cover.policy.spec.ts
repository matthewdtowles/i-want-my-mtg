import { Card } from 'src/core/card/card.entity';
import { Format } from 'src/core/card/format.enum';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Price } from 'src/core/card/price.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckCoverPolicy } from 'src/core/deck/deck-cover.policy';

let seq = 0;

function card(overrides: { name: string; type?: string; value?: number; imgSrc?: string }): Card {
    seq += 1;
    return new Card({
        id: `card-${seq}`,
        name: overrides.name,
        type: overrides.type ?? 'Creature — Human',
        imgSrc: overrides.imgSrc === undefined ? `a/b/${seq}.jpg` : overrides.imgSrc,
        number: String(seq),
        rarity: CardRarity.Rare,
        setCode: 'tst',
        sortNumber: String(seq),
        legalities: [],
        prices:
            overrides.value === undefined
                ? []
                : [new Price({ cardId: `card-${seq}`, normal: overrides.value, date: new Date() })],
    });
}

function entry(c: Card, isSideboard = false): DeckCard {
    return new DeckCard({ cardId: c.id, quantity: 1, isSideboard, card: c });
}

describe('DeckCoverPolicy', () => {
    it('prefers the commander in a commander-format deck', () => {
        const commander = card({
            name: 'Atraxa, Praetors’ Voice',
            type: 'Legendary Creature — Phyrexian Angel Horror',
            value: 5,
        });
        // Worth far more, but a commander deck is pictured by its commander.
        const bomb = card({ name: 'Jeweled Lotus', type: 'Artifact', value: 300 });

        const pick = DeckCoverPolicy.pick({ name: 'Superfriends', format: Format.Commander }, [
            entry(bomb),
            entry(commander),
        ]);

        expect(pick.name).toBe('Atraxa, Praetors’ Voice');
    });

    it('ignores the commander rule outside commander formats', () => {
        const legend = card({ name: 'Thalia', type: 'Legendary Creature — Human', value: 5 });
        const bomb = card({ name: 'Ragavan', type: 'Creature — Monkey Pirate', value: 60 });

        const pick = DeckCoverPolicy.pick({ name: 'Aggro', format: Format.Modern }, [
            entry(legend),
            entry(bomb),
        ]);

        expect(pick.name).toBe('Ragavan');
    });

    it('picks the card the deck is named after, over a more valuable one', () => {
        const namesake = card({ name: 'Kenrith, the Returned King', value: 2 });
        const bomb = card({ name: 'Mana Crypt', type: 'Artifact', value: 200 });

        const pick = DeckCoverPolicy.pick({ name: 'Kenrith Group Hug', format: Format.Modern }, [
            entry(bomb),
            entry(namesake),
        ]);

        expect(pick.name).toBe('Kenrith, the Returned King');
    });

    it('matches the deck name on whole words only', () => {
        // "Dragons" must not match the card "Dragon".
        const dragon = card({ name: 'Dragon', value: 1 });
        const other = card({ name: 'Shivan Devastator', value: 9 });

        const pick = DeckCoverPolicy.pick({ name: 'Dragons of Tarkir', format: Format.Modern }, [
            entry(dragon),
            entry(other),
        ]);

        expect(pick.name).toBe('Shivan Devastator');
    });

    it('prefers the longest namesake match', () => {
        const short = card({ name: 'Ur-Dragon', value: 50 });
        const long = card({ name: 'The Ur-Dragon, Hidden', value: 1 });

        const pick = DeckCoverPolicy.pick({ name: 'The Ur-Dragon Tribal', format: Format.Modern }, [
            entry(short),
            entry(long),
        ]);

        expect(pick.name).toBe('The Ur-Dragon, Hidden');
    });

    it('falls back to the most valuable creature', () => {
        const cheapCreature = card({ name: 'Llanowar Elves', value: 1 });
        const goodCreature = card({ name: 'Sheoldred', value: 90 });
        const pricierNonCreature = card({ name: 'The One Ring', type: 'Artifact', value: 120 });

        const pick = DeckCoverPolicy.pick({ name: 'Midrange', format: Format.Standard }, [
            entry(cheapCreature),
            entry(pricierNonCreature),
            entry(goodCreature),
        ]);

        expect(pick.name).toBe('Sheoldred');
    });

    it('falls back to the most valuable card when the deck has no creatures', () => {
        const cheap = card({ name: 'Opt', type: 'Instant', value: 1 });
        const pricey = card({ name: 'Force of Will', type: 'Instant', value: 90 });

        const pick = DeckCoverPolicy.pick({ name: 'Control', format: Format.Legacy }, [
            entry(cheap),
            entry(pricey),
        ]);

        expect(pick.name).toBe('Force of Will');
    });

    it('never picks a sideboard card when the maindeck has art', () => {
        const main = card({ name: 'Opt', type: 'Instant', value: 1 });
        const side = card({ name: 'Force of Will', type: 'Instant', value: 90 });

        const pick = DeckCoverPolicy.pick({ name: 'Control', format: Format.Legacy }, [
            entry(main),
            entry(side, true),
        ]);

        expect(pick.name).toBe('Opt');
    });

    it('uses the sideboard when the maindeck is empty', () => {
        const side = card({ name: 'Force of Will', type: 'Instant', value: 90 });

        const pick = DeckCoverPolicy.pick({ name: 'Control', format: Format.Legacy }, [
            entry(side, true),
        ]);

        expect(pick.name).toBe('Force of Will');
    });

    it('skips cards with no art', () => {
        const artless = card({ name: 'Black Lotus', type: 'Artifact', value: 9999, imgSrc: '' });
        const usable = card({ name: 'Opt', type: 'Instant', value: 1 });

        const pick = DeckCoverPolicy.pick({ name: 'Vintage', format: Format.Vintage }, [
            entry(artless),
            entry(usable),
        ]);

        expect(pick.name).toBe('Opt');
    });

    it('returns undefined for an empty deck', () => {
        expect(DeckCoverPolicy.pick({ name: 'New deck', format: null }, [])).toBeUndefined();
    });

    it('returns undefined when no card has art', () => {
        const artless = card({ name: 'Opt', type: 'Instant', value: 1, imgSrc: '' });

        expect(
            DeckCoverPolicy.pick({ name: 'Control', format: Format.Legacy }, [entry(artless)])
        ).toBeUndefined();
    });

    it('tolerates a deck with no name', () => {
        const only = card({ name: 'Opt', type: 'Instant', value: 1 });

        expect(DeckCoverPolicy.pick({ format: null }, [entry(only)]).name).toBe('Opt');
    });
});
