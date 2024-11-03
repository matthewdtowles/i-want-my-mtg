import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from '../../src/adapters/http/card.controller';
import { CardServicePort } from '../../src/core/card/api/card.service.port';
import { CardMapper } from '../../src/core/card/card.mapper';
import { IngestionOrchestratorPort } from '../../src/core/ingestion/api/ingestion.orchestrator.port';

describe('CardController', () => {
    let controller: CardController;
    let mockCardService: CardServicePort = {
        save: jest.fn(),
        findAllInSet: jest.fn(),
        findAllWithName: jest.fn(),
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        findByUuid: jest.fn(),
    };
    let mockIngestionOrchestrator: IngestionOrchestratorPort = {
        ingestAllSetMeta: jest.fn(),
        ingestAllSetCards: jest.fn(),
        ingestSetCards: jest.fn()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardController],
            providers: [
                CardMapper,
                {
                    provide: CardServicePort,
                    useValue: mockCardService,
                },
                {
                    provide: 'IngestionOrchestratorPort',
                    useValue: mockIngestionOrchestrator,
                },
            ],
        }).compile();
        controller = module.get<CardController>(CardController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
