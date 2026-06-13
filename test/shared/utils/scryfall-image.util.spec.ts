import { buildScryfallImagePath } from 'src/shared/utils/scryfall-image.util';

describe('scryfall-image.util', () => {
    const scryfallId = 'a363bc91-8278-448e-9d5c-564e4b51eb62';
    // What scry once stored in card.img_src for this id: {a}/{b}/{id}.jpg
    const expectedTail = 'a/3/a363bc91-8278-448e-9d5c-564e4b51eb62.jpg';

    describe('buildScryfallImagePath', () => {
        it('builds {a}/{b}/{id}.jpg from the first two characters', () => {
            expect(buildScryfallImagePath(scryfallId)).toBe(expectedTail);
        });

        it('returns an empty string when the id is missing', () => {
            expect(buildScryfallImagePath(undefined)).toBe('');
            expect(buildScryfallImagePath(null)).toBe('');
            expect(buildScryfallImagePath('')).toBe('');
        });
    });
});
