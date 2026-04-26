import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductPrice } from 'src/core/sealed-product/sealed-product-price.entity';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProductApiPresenter } from 'src/http/api/sealed-product/sealed-product-api.presenter';

describe('SealedProductApiPresenter', () => {
    describe('toResponse', () => {
        it('should map domain entity to API response DTO', () => {
            const product = new SealedProduct({
                uuid: 'uuid-1',
                name: 'Draft Booster Box',
                setCode: 'blb',
                category: 'booster_box',
                subtype: 'draft',
                cardCount: 540,
                productSize: 36,
                releaseDate: '2024-08-02',
                contentsSummary: '36x Draft Booster Pack',
                tcgplayerProductId: '672033',
            });

            const dto = SealedProductApiPresenter.toResponse(product);

            expect(dto.uuid).toBe('uuid-1');
            expect(dto.name).toBe('Draft Booster Box');
            expect(dto.setCode).toBe('blb');
            expect(dto.category).toBe('booster_box');
            expect(dto.subtype).toBe('draft');
            expect(dto.cardCount).toBe(540);
            expect(dto.productSize).toBe(36);
            expect(dto.releaseDate).toBe('2024-08-02');
            expect(dto.contentsSummary).toBe('36x Draft Booster Pack');
            expect(dto.tcgplayerProductId).toBe('672033');
            expect(dto.purchaseUrlTcgplayer).toContain('partner.tcgplayer.com/PzKzOM?u=');
            expect(dto.purchaseUrlTcgplayer).toContain(
                encodeURIComponent('tcgplayer.com/product/672033')
            );
        });

        it('should include price when present', () => {
            const product = new SealedProduct({
                uuid: 'uuid-1',
                name: 'Draft Booster Box',
                setCode: 'blb',
                price: new SealedProductPrice({
                    price: 89.99,
                    priceChangeWeekly: -3.5,
                    date: '2024-01-15',
                }),
            });

            const dto = SealedProductApiPresenter.toResponse(product);

            expect(dto.price).toEqual({
                price: 89.99,
                priceChangeWeekly: -3.5,
                date: '2024-01-15',
            });
        });

        it('should omit price when not present', () => {
            const product = new SealedProduct({
                uuid: 'uuid-1',
                name: 'Draft Booster Box',
                setCode: 'blb',
            });

            const dto = SealedProductApiPresenter.toResponse(product);

            expect(dto.price).toBeUndefined();
        });
    });

    describe('toInventoryResponse', () => {
        it('should map inventory domain entity to API DTO', () => {
            const product = new SealedProduct({
                uuid: 'uuid-1',
                name: 'Draft Booster Box',
                setCode: 'blb',
            });
            const item = new SealedProductInventory({
                sealedProductUuid: 'uuid-1',
                userId: 1,
                quantity: 3,
                sealedProduct: product,
            });

            const dto = SealedProductApiPresenter.toInventoryResponse(item);

            expect(dto.sealedProductUuid).toBe('uuid-1');
            expect(dto.quantity).toBe(3);
            expect(dto.sealedProduct.name).toBe('Draft Booster Box');
        });
    });
});
