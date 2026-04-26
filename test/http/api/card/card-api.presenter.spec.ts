import { TCGPLAYER_PRODUCT_URL_TEMPLATE } from 'src/core/affiliate/affiliate-link.policy';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Price } from 'src/core/card/price.entity';
import { Set } from 'src/core/set/set.entity';
import { CardApiPresenter } from 'src/http/api/card/card-api.presenter';

function createCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-1',
        name: 'Lightning Bolt',
        setCode: 'lea',
        number: '161',
        type: 'Instant',
        rarity: CardRarity.Common,
        imgSrc: 'abc123.jpg',
        hasFoil: false,
        hasNonFoil: true,
        sortNumber: '161',
        legalities: [],
        ...overrides,
    });
}

function createPrice(overrides: Partial<Price> = {}): Price {
    return new Price({
        cardId: 'card-1',
        normal: 1.5,
        foil: 3.0,
        normalChangeWeekly: 0.25,
        foilChangeWeekly: -0.1,
        date: new Date(),
        ...overrides,
    });
}

describe('CardApiPresenter', () => {
    describe('toCardApiResponse', () => {
        it('should map a card with prices to CardApiResponseDto', () => {
            const price = createPrice();
            const card = createCard({ prices: [price] });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.id).toBe('card-1');
            expect(result.name).toBe('Lightning Bolt');
            expect(result.setCode).toBe('lea');
            expect(result.number).toBe('161');
            expect(result.type).toBe('Instant');
            expect(result.rarity).toBe('common');
            expect(result.imgSrc).toBe('abc123.jpg');
            expect(result.hasFoil).toBe(false);
            expect(result.hasNonFoil).toBe(true);
            expect(result.prices).toEqual({
                normal: 1.5,
                foil: 3.0,
                normalChangeWeekly: 0.25,
                foilChangeWeekly: -0.1,
            });
        });

        it('should return undefined prices when card has no prices', () => {
            const card = createCard({ prices: undefined });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.prices).toBeUndefined();
        });

        it('should return undefined prices when prices array is empty', () => {
            const card = createCard({ prices: [] });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.prices).toBeUndefined();
        });

        it('should handle null price fields', () => {
            const price = createPrice({
                normal: null,
                foil: null,
                normalChangeWeekly: null,
                foilChangeWeekly: null,
            });
            const card = createCard({ prices: [price] });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.prices).toEqual({
                normal: null,
                foil: null,
                normalChangeWeekly: null,
                foilChangeWeekly: null,
            });
        });

        it('should include setName when set is present', () => {
            const card = createCard({
                set: { name: 'Limited Edition Alpha', code: 'lea' } as Set,
            });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.setName).toBe('Limited Edition Alpha');
        });

        it('should have undefined setName when set is absent', () => {
            const card = createCard({ set: undefined });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.setName).toBeUndefined();
        });

        it('should include keyruneCode from set when set is present', () => {
            const card = createCard({
                set: { name: 'Limited Edition Alpha', code: 'lea', keyruneCode: 'lea' } as Set,
            });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.keyruneCode).toBe('lea');
        });

        it('should fall back to setCode for keyruneCode when set is absent', () => {
            const card = createCard({ set: undefined });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.keyruneCode).toBe('lea');
        });

        it('should include optional card fields', () => {
            const card = createCard({
                manaCost: '{R}',
                oracleText: 'Deal 3 damage to any target.',
                artist: 'Christopher Rush',
                flavorName: 'Pew Pew McGee',
            });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.manaCost).toBe('{R}');
            expect(result.oracleText).toBe('Deal 3 damage to any target.');
            expect(result.artist).toBe('Christopher Rush');
            expect(result.flavorName).toBe('Pew Pew McGee');
        });

        it('should have undefined flavorName when not present', () => {
            const card = createCard({ flavorName: undefined });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.flavorName).toBeUndefined();
        });

        it('should leave purchaseUrlTcgplayer fields undefined when product IDs are absent', () => {
            const card = createCard();
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.purchaseUrlTcgplayer).toBeUndefined();
            expect(result.purchaseUrlTcgplayerEtched).toBeUndefined();
        });

        it('should wrap purchase URLs in the affiliate shortlink', () => {
            const card = createCard({
                tcgplayerProductId: '672033',
                tcgplayerEtchedProductId: '672034',
            });
            const result = CardApiPresenter.toCardApiResponse(card);

            const normalDest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            const etchedDest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672034');
            expect(result.purchaseUrlTcgplayer).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(normalDest)
            );
            expect(result.purchaseUrlTcgplayerEtched).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(etchedDest)
            );
        });

        it('should always include weekly change fields (even when null)', () => {
            const price = createPrice({
                normalChangeWeekly: null,
                foilChangeWeekly: null,
            });
            const card = createCard({ prices: [price] });
            const result = CardApiPresenter.toCardApiResponse(card);

            expect(result.prices).toHaveProperty('normalChangeWeekly');
            expect(result.prices).toHaveProperty('foilChangeWeekly');
        });
    });
});
