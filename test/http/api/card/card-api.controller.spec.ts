import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { Price } from 'src/core/card/price.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { CardService } from 'src/core/card/card.service';
import { CardApiController } from 'src/http/api/card/card-api.controller';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { ApiUsageService } from 'src/core/api-tier/api-usage.service';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';
import { OptionalAuthOrApiKeyGuard } from 'src/http/api/shared/optional-auth-or-api-key.guard';

function createCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-1',
        name: 'Lightning Bolt',
        setCode: 'lea',
        number: '161',
        type: 'Instant',
        rarity: CardRarity.Common,
        imgSrc: 'abc123.jpg',
        hasFoil: true,
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
        foil: 3,
        date: new Date('2024-01-02T00:00:00.000Z'),
        ...overrides,
    });
}

describe('CardApiController', () => {
    let controller: CardApiController;
    let cardService: jest.Mocked<CardService>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardApiController],
            providers: [
                {
                    provide: CardService,
                    useValue: {
                        searchByName: jest.fn(),
                        totalSearchByName: jest.fn(),
                        searchByNameGrouped: jest.fn(),
                        totalSearchByNameGrouped: jest.fn(),
                        findByIdsWithPrices: jest.fn(),
                        findBySetCodeAndNumber: jest.fn(),
                        findPriceHistory: jest.fn(),
                    },
                },
                {
                    provide: ApiRateLimitGuard,
                    useValue: { canActivate: jest.fn().mockReturnValue(true) },
                },
                { provide: ApiSubscriptionService, useValue: {} },
                { provide: ApiUsageService, useValue: {} },
            ],
        })
            .overrideGuard(OptionalAuthOrApiKeyGuard)
            .useValue({ canActivate: jest.fn().mockReturnValue(true) })
            .compile();

        controller = module.get(CardApiController);
        cardService = module.get(CardService) as jest.Mocked<CardService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('returns an empty page when no query term is supplied', async () => {
            const result = await controller.search({});

            expect(result.data).toEqual([]);
            expect(cardService.searchByName).not.toHaveBeenCalled();
            expect(cardService.searchByNameGrouped).not.toHaveBeenCalled();
        });

        it('uses the per-printing search by default', async () => {
            cardService.searchByName.mockResolvedValue([createCard({ prices: [createPrice()] })]);
            cardService.totalSearchByName.mockResolvedValue(1);

            const result = await controller.search({ q: 'bolt' });

            expect(cardService.searchByName).toHaveBeenCalledWith('bolt', expect.anything());
            expect(cardService.searchByNameGrouped).not.toHaveBeenCalled();
            expect(result.data).toHaveLength(1);
            expect(result.data[0].legal).toBeUndefined();
            expect(result.meta?.total).toBe(1);
        });

        it('groups by name and omits the legal flag when no format is given', async () => {
            cardService.searchByNameGrouped.mockResolvedValue([
                createCard({ prices: [createPrice()] }),
            ]);
            cardService.totalSearchByNameGrouped.mockResolvedValue(1);

            const result = await controller.search({ q: 'bolt', groupBy: 'name' });

            expect(cardService.searchByNameGrouped).toHaveBeenCalledWith('bolt', expect.anything());
            expect(cardService.searchByName).not.toHaveBeenCalled();
            expect(result.data).toHaveLength(1);
            expect(result.data[0].legal).toBeUndefined();
        });

        it('groups by name and flags legality when a format is given', async () => {
            cardService.searchByNameGrouped.mockResolvedValue([
                createCard({
                    prices: [createPrice()],
                    legalities: [
                        { format: 'modern', status: 'legal' } as never,
                    ],
                }),
            ]);
            cardService.totalSearchByNameGrouped.mockResolvedValue(1);

            const result = await controller.search({
                q: 'bolt',
                groupBy: 'name',
                format: 'modern',
            });

            expect(result.data[0].legal).toBe(true);
        });

        it('rejects an invalid groupBy instead of silently falling back', async () => {
            await expect(controller.search({ q: 'bolt', groupBy: 'foo' })).rejects.toBeInstanceOf(
                BadRequestException
            );
            // A case typo must not silently return per-printing results either.
            await expect(controller.search({ q: 'bolt', groupBy: 'Name' })).rejects.toBeInstanceOf(
                BadRequestException
            );
            expect(cardService.searchByName).not.toHaveBeenCalled();
            expect(cardService.searchByNameGrouped).not.toHaveBeenCalled();
        });

        it('flags a card with no legality entry as not legal in the format', async () => {
            cardService.searchByNameGrouped.mockResolvedValue([
                createCard({ prices: [createPrice()], legalities: [] }),
            ]);
            cardService.totalSearchByNameGrouped.mockResolvedValue(1);

            const result = await controller.search({
                q: 'bolt',
                groupBy: 'name',
                format: 'standard',
            });

            expect(result.data[0].legal).toBe(false);
        });
    });

    describe('getPriceHistoryById', () => {
        it('allows unauthenticated users to request the full requested range', async () => {
            cardService.findPriceHistory.mockResolvedValue([createPrice()]);

            const result = await controller.getPriceHistoryById('card-1', '365');

            expect(cardService.findPriceHistory).toHaveBeenCalledWith('card-1', 365);
            expect(result.success).toBe(true);
            expect(result.data).toEqual([
                {
                    date: '2024-01-02',
                    normal: 1.5,
                    foil: 3,
                },
            ]);
        });

        it('passes through all-history requests for unauthenticated users', async () => {
            cardService.findPriceHistory.mockResolvedValue([]);

            await controller.getPriceHistoryById('card-1');

            expect(cardService.findPriceHistory).toHaveBeenCalledWith('card-1', undefined);
        });
    });

    describe('getPriceHistoryBySetCodeAndNumber', () => {
        it('resolves the card and returns price history for all users', async () => {
            cardService.findBySetCodeAndNumber.mockResolvedValue(createCard());
            cardService.findPriceHistory.mockResolvedValue([
                createPrice({ normal: 2.25, foil: null }),
            ]);

            const result = await controller.getPriceHistoryBySetCodeAndNumber('lea', '161', '');

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalledWith('lea', '161');
            expect(cardService.findPriceHistory).toHaveBeenCalledWith('card-1', undefined);
            expect(result.data).toEqual([
                {
                    date: '2024-01-02',
                    normal: 2.25,
                    foil: null,
                },
            ]);
        });

        it('throws when the card cannot be found', async () => {
            cardService.findBySetCodeAndNumber.mockResolvedValue(null);

            await expect(
                controller.getPriceHistoryBySetCodeAndNumber('lea', '999', '30')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(cardService.findPriceHistory).not.toHaveBeenCalled();
        });
    });
});
