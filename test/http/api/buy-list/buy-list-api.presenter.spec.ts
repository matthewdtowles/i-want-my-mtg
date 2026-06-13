import { BuyListItem } from 'src/core/buy-list/buy-list-item.entity';
import { Card } from 'src/core/card/card.entity';
import { Price } from 'src/core/card/price.entity';
import { Set } from 'src/core/set/set.entity';
import { BuyListApiPresenter } from 'src/http/api/buy-list/buy-list-api.presenter';

function makeCard(): Card {
    return new Card({
        id: 'card-1',
        imgSrc: 'a/b/card-1.jpg',
        name: 'Sol Ring',
        number: '1',
        rarity: 'uncommon' as Card['rarity'],
        setCode: 'cmd',
        sortNumber: '1',
        type: 'Artifact',
        legalities: [],
        hasFoil: true,
        hasNonFoil: true,
        prices: [new Price({ cardId: 'card-1', normal: 2.5, foil: 6, date: new Date() })],
        set: new Set({
            code: 'cmd',
            name: 'Commander',
            keyruneCode: 'cmd',
            type: 'commander',
            block: 'commander',
            releaseDate: '2011-06-17',
            baseSize: 1,
            totalSize: 1,
            isMain: true,
        }),
    });
}

describe('BuyListApiPresenter', () => {
    it('maps an item with card data, picking the finish price', () => {
        const item = new BuyListItem({
            userId: 7,
            cardId: 'card-1',
            isFoil: true,
            quantity: 2,
            card: makeCard(),
        });
        const dto = BuyListApiPresenter.toItem(item);
        expect(dto).toMatchObject({
            cardId: 'card-1',
            quantity: 2,
            isFoil: true,
            cardName: 'Sol Ring',
            setCode: 'cmd',
            cardNumber: '1',
            priceNormal: 2.5,
            priceFoil: 6,
            hasFoil: true,
            hasNonFoil: true,
        });
        expect(dto.imgSrc).toContain('a/b/card-1.jpg');
        expect(dto.url).toBeTruthy();
    });

    it('returns a minimal dto when card data is absent', () => {
        const item = new BuyListItem({ userId: 7, cardId: 'card-1', isFoil: false, quantity: 1 });
        const dto = BuyListApiPresenter.toItem(item);
        expect(dto).toEqual({ cardId: 'card-1', quantity: 1, isFoil: false });
    });
});
