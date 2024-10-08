import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from '../../src/adapters/http/card.controller';
import { CardServicePort } from '../../src/core/card/ports/card.service.port';
import { CardMapper } from '../../src/core/card/card.mapper';

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
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardController],
            providers: [
                {
                    provide: CardServicePort,
                    useValue: mockCardService,
                },
                CardMapper
            ],
        }).compile();

        controller = module.get<CardController>(CardController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
