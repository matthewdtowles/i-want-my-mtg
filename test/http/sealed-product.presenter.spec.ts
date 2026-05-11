import { TCGPLAYER_PRODUCT_URL_TEMPLATE } from 'src/core/affiliate/affiliate-link.policy';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductPrice } from 'src/core/sealed-product/sealed-product-price.entity';
import { SealedProductHbsPresenter } from 'src/http/hbs/sealed-product/sealed-product.presenter';

describe('SealedProductHbsPresenter', () => {
    const baseProduct = (overrides: Partial<SealedProduct> = {}): SealedProduct =>
        new SealedProduct({
            uuid: 'abc-123',
            name: 'Draft Booster Box',
            setCode: 'blb',
            category: 'booster_box',
            subtype: 'draft',
            cardCount: 36,
            productSize: 36,
            releaseDate: '2024-08-02',
            contentsSummary: '36x Draft Booster Pack',
            tcgplayerProductId: '500001',
            price: new SealedProductPrice({ price: 99.99, priceChangeWeekly: 1.5, date: '2024-08-02' }),
            ...overrides,
        });

    describe('toRow', () => {
        it('maps basic fields and builds detail URL', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct());
            expect(row.uuid).toBe('abc-123');
            expect(row.name).toBe('Draft Booster Box');
            expect(row.setCode).toBe('blb');
            expect(row.detailUrl).toBe('/sealed-products/abc-123');
        });

        it('converts snake_case category/subtype to title-case labels', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct());
            expect(row.category).toBe('booster_box');
            expect(row.categoryLabel).toBe('Booster Box');
            expect(row.subtype).toBe('draft');
            expect(row.subtypeLabel).toBe('Draft');
        });

        it('derives image URLs from tcgplayer product id', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct());
            expect(row.imageUrl).toBe(
                'https://product-images.tcgplayer.com/fit-in/437x437/500001.jpg'
            );
            expect(row.thumbnailUrl).toBe(
                'https://product-images.tcgplayer.com/fit-in/200x200/500001.jpg'
            );
        });

        it('omits image URLs when tcgplayer product id is missing', () => {
            const row = SealedProductHbsPresenter.toRow(
                baseProduct({ tcgplayerProductId: undefined })
            );
            expect(row.imageUrl).toBeUndefined();
            expect(row.thumbnailUrl).toBeUndefined();
        });

        it('wraps purchase URL in the affiliate shortlink', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct());
            const dest = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '500001');
            expect(row.purchaseUrlTcgplayer).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(dest)
            );
        });

        it('leaves purchase URL undefined when product id is missing', () => {
            const row = SealedProductHbsPresenter.toRow(
                baseProduct({ tcgplayerProductId: undefined })
            );
            expect(row.purchaseUrlTcgplayer).toBeUndefined();
        });

        it('defaults ownedQuantity to 0 when not provided', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct());
            expect(row.ownedQuantity).toBe(0);
        });

        it('uses explicit ownedQuantity when provided', () => {
            const row = SealedProductHbsPresenter.toRow(baseProduct(), 3);
            expect(row.ownedQuantity).toBe(3);
        });
    });

    describe('toRows', () => {
        it('maps multiple products and pulls owned quantities from map', () => {
            const products = [
                baseProduct({ uuid: 'a', name: 'A' }),
                baseProduct({ uuid: 'b', name: 'B' }),
                baseProduct({ uuid: 'c', name: 'C' }),
            ];
            const quantities = new Map<string, number>([
                ['a', 2],
                ['c', 5],
            ]);

            const rows = SealedProductHbsPresenter.toRows(products, quantities);

            expect(rows).toHaveLength(3);
            expect(rows[0].ownedQuantity).toBe(2);
            expect(rows[1].ownedQuantity).toBe(0);
            expect(rows[2].ownedQuantity).toBe(5);
        });

        it('handles missing quantities map entirely', () => {
            const products = [baseProduct()];
            const rows = SealedProductHbsPresenter.toRows(products);
            expect(rows).toHaveLength(1);
            expect(rows[0].ownedQuantity).toBe(0);
        });
    });
});
