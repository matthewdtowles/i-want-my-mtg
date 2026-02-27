import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from 'src/http/card/card.controller';
import { CardOrchestrator } from 'src/http/card/card.orchestrator';

describe('CardController', () => {
    let controller: CardController;

    const mockOrchestrator = {
        findSetCard: jest.fn(),
        getPriceHistory: jest.fn(),
        getPrintingsLastPage: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardController],
            providers: [{ provide: CardOrchestrator, useValue: mockOrchestrator }],
        }).compile();

        controller = module.get<CardController>(CardController);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPriceHistory', () => {
        it('should return price history for a card', async () => {
            const mockResponse = {
                cardId: 'card1',
                prices: [{ date: '2025-01-01', normal: 1.5, foil: 3.0 }],
            };
            mockOrchestrator.getPriceHistory.mockResolvedValue(mockResponse);

            const result = await controller.getPriceHistory('card1');

            expect(mockOrchestrator.getPriceHistory).toHaveBeenCalledWith('card1', undefined);
            expect(result).toEqual(mockResponse);
        });

        it('should parse days query parameter', async () => {
            const mockResponse = { cardId: 'card1', prices: [] };
            mockOrchestrator.getPriceHistory.mockResolvedValue(mockResponse);

            const result = await controller.getPriceHistory('card1', '30');

            expect(mockOrchestrator.getPriceHistory).toHaveBeenCalledWith('card1', 30);
            expect(result).toEqual(mockResponse);
        });

        it('should ignore invalid days parameter', async () => {
            const mockResponse = { cardId: 'card1', prices: [] };
            mockOrchestrator.getPriceHistory.mockResolvedValue(mockResponse);

            const result = await controller.getPriceHistory('card1', 'abc');

            expect(mockOrchestrator.getPriceHistory).toHaveBeenCalledWith('card1', undefined);
            expect(result).toEqual(mockResponse);
        });
    });
});
