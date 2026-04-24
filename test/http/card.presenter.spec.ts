import { TCGPLAYER_PRODUCT_URL_TEMPLATE } from 'src/core/affiliate/affiliate-link.policy';
import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Price } from 'src/core/card/price.entity';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { InventoryQuantities } from 'src/http/hbs/inventory/inventory.quantities';

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

describe('CardPresenter', () => {
    describe('toSingleCardResponse', () => {
        const inventory = new InventoryQuantities(0, 0);

        it('leaves both purchase URLs undefined when product IDs are missing', () => {
            const card = createCard();

            const result = CardPresenter.toSingleCardResponse(card, inventory, CardImgType.SMALL);

            expect(result.purchaseUrlTcgplayer).toBeUndefined();
            expect(result.purchaseUrlTcgplayerEtched).toBeUndefined();
        });

        it('wraps purchase URLs in the affiliate shortlink', () => {
            const card = createCard({
                tcgplayerProductId: '672033',
                tcgplayerEtchedProductId: '672034',
            });

            const result = CardPresenter.toSingleCardResponse(card, inventory, CardImgType.SMALL);

            const normalDest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            const etchedDest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672034');
            expect(result.purchaseUrlTcgplayer).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(normalDest)
            );
            expect(result.purchaseUrlTcgplayerEtched).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(etchedDest)
            );
        });

        it('leaves etched URL undefined when only the normal product ID is set', () => {
            const card = createCard({ tcgplayerProductId: '672033' });

            const result = CardPresenter.toSingleCardResponse(card, inventory, CardImgType.SMALL);

            const normalDest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            expect(result.purchaseUrlTcgplayer).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(normalDest)
            );
            expect(result.purchaseUrlTcgplayerEtched).toBeUndefined();
        });
    });

    describe('formatPriceChange', () => {
        it('returns empty strings when price is undefined', () => {
            const result = CardPresenter.formatPriceChange(undefined);

            expect(result.priceChangeWeekly).toBe('');
            expect(result.priceChangeWeeklySign).toBe('');
            expect(result.foilPriceChangeWeekly).toBe('');
            expect(result.foilPriceChangeWeeklySign).toBe('');
        });

        it('returns empty strings when both change values are null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: null,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('');
            expect(result.priceChangeWeeklySign).toBe('');
            expect(result.foilPriceChangeWeekly).toBe('');
            expect(result.foilPriceChangeWeeklySign).toBe('');
        });

        it('formats positive change with + prefix and positive sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 2.5,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$2.50');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });

        it('formats negative change with - prefix and negative sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: -1.25,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('-$1.25');
            expect(result.priceChangeWeeklySign).toBe('negative');
        });

        it('formats zero change as neutral', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 0,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('$0.00');
            expect(result.priceChangeWeeklySign).toBe('neutral');
        });

        it('falls back to foilChangeWeekly when normalChangeWeekly is null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: null,
                foilChangeWeekly: 3.75,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$3.75');
            expect(result.priceChangeWeeklySign).toBe('positive');
            expect(result.foilPriceChangeWeekly).toBe('+$3.75');
            expect(result.foilPriceChangeWeeklySign).toBe('positive');
        });

        it('prefers normalChangeWeekly over foilChangeWeekly when both present', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: -0.5,
                foilChangeWeekly: 10.0,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('-$0.50');
            expect(result.priceChangeWeeklySign).toBe('negative');
            expect(result.foilPriceChangeWeekly).toBe('+$10.00');
            expect(result.foilPriceChangeWeeklySign).toBe('positive');
        });

        it('formats large values with comma separators', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 1234.56,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$1,234.56');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });

        it('handles string values from database', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: '5.99' as any,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$5.99');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });
    });
});
