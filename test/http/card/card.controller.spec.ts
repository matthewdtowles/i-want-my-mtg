import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from '../../../src/http/card/card.controller';
import { CardServicePort } from '../../../src/core/card/ports/card.service.port';
import { CardMapper } from '../../../src/http/card/card.mapper';

describe('CardController', () => {
    let controller: CardController;
    let mockCardService: CardServicePort = {
        create: jest.fn(),
        findAllInSet: jest.fn(),
        findAllWithName: jest.fn(),
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
        update: jest.fn(),
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
