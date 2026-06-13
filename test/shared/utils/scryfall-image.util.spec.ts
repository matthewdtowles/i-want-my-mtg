import { buildScryfallImagePath, cardImageTail } from 'src/shared/utils/scryfall-image.util';

describe('scryfall-image.util', () => {
    const scryfallId = 'a363bc91-8278-448e-9d5c-564e4b51eb62';
    // What scry stored in card.img_src for this id: {a}/{b}/{id}.jpg
    const expectedTail = 'a/3/a363bc91-8278-448e-9d5c-564e4b51eb62.jpg';

    describe('buildScryfallImagePath', () => {
        it('builds {a}/{b}/{id}.jpg from the first two characters', () => {
            expect(buildScryfallImagePath(scryfallId)).toBe(expectedTail);
        });
    });

    describe('cardImageTail', () => {
        it('derives from scryfallId, ignoring any stored imgSrc', () => {
            expect(cardImageTail(scryfallId, 'stale/x/value.jpg')).toBe(expectedTail);
        });

        it('falls back to imgSrc when scryfallId is missing', () => {
            expect(cardImageTail(undefined, 'a/b/legacy.jpg')).toBe('a/b/legacy.jpg');
            expect(cardImageTail(null, 'a/b/legacy.jpg')).toBe('a/b/legacy.jpg');
        });

        it('returns an empty string when neither is available', () => {
            expect(cardImageTail(undefined, undefined)).toBe('');
            expect(cardImageTail(null, null)).toBe('');
        });
    });
});
