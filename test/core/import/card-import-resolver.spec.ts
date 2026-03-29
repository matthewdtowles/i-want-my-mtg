import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { CardImportResolver } from 'src/core/import/card-import-resolver';

function makeCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-uuid-1',
        imgSrc: 'img.jpg',
        legalities: [],
        name: 'Teferi',
        number: '1',
        rarity: CardRarity.Rare,
        setCode: 'dmu',
        sortNumber: '0001',
        type: 'Planeswalker',
        hasNonFoil: true,
        hasFoil: true,
        inMain: true,
        ...overrides,
    });
}

describe('CardImportResolver', () => {
    let resolver: CardImportResolver;

    const mockCardRepo = {
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        findByNameAndSetCode: jest.fn(),
        findBySet: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardImportResolver,
                { provide: CardRepositoryPort, useValue: mockCardRepo },
            ],
        }).compile();

        resolver = module.get<CardImportResolver>(CardImportResolver);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resolveCard', () => {
        it('resolves card by id', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);

            const result = await resolver.resolveCard({ id: 'card-uuid-1' });

            expect(result.card).toBe(card);
            expect(result.error).toBeNull();
            expect(mockCardRepo.findById).toHaveBeenCalledWith('card-uuid-1', []);
        });

        it('resolves card by set_code and number', async () => {
            const card = makeCard();
            mockCardRepo.findBySetCodeAndNumber.mockResolvedValue(card);

            const result = await resolver.resolveCard({ set_code: 'dmu', number: '1' });

            expect(result.card).toBe(card);
            expect(result.error).toBeNull();
            expect(mockCardRepo.findBySetCodeAndNumber).toHaveBeenCalledWith('dmu', '1', []);
        });

        it('resolves card by name and set_code', async () => {
            const card = makeCard();
            mockCardRepo.findByNameAndSetCode.mockResolvedValue([card]);

            const result = await resolver.resolveCard({ name: 'Teferi', set_code: 'dmu' });

            expect(result.card).toBe(card);
            expect(result.error).toBeNull();
        });

        it('returns error when card not found by id', async () => {
            mockCardRepo.findById.mockResolvedValue(null);

            const result = await resolver.resolveCard({ id: 'bad-id' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/not found/i);
        });

        it('returns error when card not found by set_code and number', async () => {
            mockCardRepo.findBySetCodeAndNumber.mockResolvedValue(null);

            const result = await resolver.resolveCard({ set_code: 'dmu', number: '999' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/not found/i);
        });

        it('returns error when name and set_code match multiple cards', async () => {
            const card1 = makeCard({ id: 'c1' });
            const card2 = makeCard({ id: 'c2' });
            mockCardRepo.findByNameAndSetCode.mockResolvedValue([card1, card2]);

            const result = await resolver.resolveCard({ name: 'Forest', set_code: 'dmu' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/[Aa]mbiguous/);
        });

        it('returns error when name and set_code match no cards', async () => {
            mockCardRepo.findByNameAndSetCode.mockResolvedValue([]);

            const result = await resolver.resolveCard({ name: 'Fake', set_code: 'dmu' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/not found/i);
        });

        it('returns error on insufficient identifiers', async () => {
            const result = await resolver.resolveCard({ name: 'Teferi' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/[Ii]nsufficient/);
        });

        it('returns error on empty identifiers', async () => {
            const result = await resolver.resolveCard({});

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/[Ii]nsufficient/);
        });

        it('returns error when repository throws', async () => {
            mockCardRepo.findById.mockRejectedValue(new Error('DB down'));

            const result = await resolver.resolveCard({ id: 'card-uuid-1' });

            expect(result.card).toBeNull();
            expect(result.error).toMatch(/DB down/);
        });

        it('prefers id lookup over other identifiers', async () => {
            const card = makeCard();
            mockCardRepo.findById.mockResolvedValue(card);

            await resolver.resolveCard({ id: 'card-uuid-1', set_code: 'dmu', number: '1' });

            expect(mockCardRepo.findById).toHaveBeenCalled();
            expect(mockCardRepo.findBySetCodeAndNumber).not.toHaveBeenCalled();
        });

        it('prefers set_code+number over name+set_code', async () => {
            const card = makeCard();
            mockCardRepo.findBySetCodeAndNumber.mockResolvedValue(card);

            await resolver.resolveCard({ name: 'Teferi', set_code: 'dmu', number: '1' });

            expect(mockCardRepo.findBySetCodeAndNumber).toHaveBeenCalled();
            expect(mockCardRepo.findByNameAndSetCode).not.toHaveBeenCalled();
        });
    });

    describe('resolveFoil', () => {
        it('returns false when card has non-foil and no explicit foil value', () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            expect(resolver.resolveFoil(undefined, card)).toBe(false);
        });

        it('returns true when card is foil-only and no explicit foil value', () => {
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            expect(resolver.resolveFoil(undefined, card)).toBe(true);
        });

        it('returns true when explicitly set to true', () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            expect(resolver.resolveFoil('true', card)).toBe(true);
        });

        it('returns false when explicitly set to false and card has non-foil', () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            expect(resolver.resolveFoil('false', card)).toBe(false);
        });

        it('returns null when explicitly set to false but card is foil-only', () => {
            const card = makeCard({ hasNonFoil: false, hasFoil: true });
            expect(resolver.resolveFoil('false', card)).toBeNull();
        });

        it('treats empty string same as undefined', () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            expect(resolver.resolveFoil('', card)).toBe(false);
        });

        it('handles yes/1 as true', () => {
            const card = makeCard({ hasNonFoil: true, hasFoil: true });
            expect(resolver.resolveFoil('yes', card)).toBe(true);
            expect(resolver.resolveFoil('1', card)).toBe(true);
        });
    });
});
