import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductPrice } from 'src/core/sealed-product/sealed-product-price.entity';

describe('SealedProduct', () => {
    const validInit = {
        uuid: 'test-uuid-123',
        name: 'Bloomburrow Draft Booster Box',
        setCode: 'blb',
    };

    it('should create with required fields', () => {
        const product = new SealedProduct(validInit);
        expect(product.uuid).toBe('test-uuid-123');
        expect(product.name).toBe('Bloomburrow Draft Booster Box');
        expect(product.setCode).toBe('blb');
    });

    it('should create with all optional fields', () => {
        const price = new SealedProductPrice({
            price: 99.99,
            date: '2024-01-01',
        });
        const product = new SealedProduct({
            ...validInit,
            category: 'booster_box',
            subtype: 'draft',
            cardCount: 540,
            productSize: 36,
            releaseDate: '2024-08-02',
            contentsSummary: '36x Draft Booster Pack',
            tcgplayerProductId: '672033',
            price,
        });
        expect(product.category).toBe('booster_box');
        expect(product.subtype).toBe('draft');
        expect(product.cardCount).toBe(540);
        expect(product.productSize).toBe(36);
        expect(product.releaseDate).toBe('2024-08-02');
        expect(product.contentsSummary).toBe('36x Draft Booster Pack');
        expect(product.tcgplayerProductId).toBe('672033');
        expect(product.price).toBe(price);
    });

    it('should throw when uuid is missing', () => {
        expect(() => new SealedProduct({ name: 'Test', setCode: 'tst' })).toThrow(
            'uuid is required'
        );
    });

    it('should throw when name is missing', () => {
        expect(() => new SealedProduct({ uuid: 'abc', setCode: 'tst' })).toThrow(
            'name is required'
        );
    });

    it('should throw when setCode is missing', () => {
        expect(() => new SealedProduct({ uuid: 'abc', name: 'Test' })).toThrow(
            'setCode is required'
        );
    });
});

describe('SealedProductPrice', () => {
    it('should create with required fields', () => {
        const price = new SealedProductPrice({
            price: 89.99,
            date: '2024-01-15',
        });
        expect(price.price).toBe(89.99);
        expect(price.date).toBe('2024-01-15');
    });

    it('should create with optional priceChangeWeekly', () => {
        const price = new SealedProductPrice({
            price: 89.99,
            priceChangeWeekly: -5.0,
            date: '2024-01-15',
        });
        expect(price.priceChangeWeekly).toBe(-5.0);
    });

    it('should throw when date is missing', () => {
        expect(() => new SealedProductPrice({ price: 10 })).toThrow('date is required');
    });
});
