import { Test, TestingModule } from '@nestjs/testing';
import { CardMapper } from '../../../src/core/card/card.mapper';
import { SetMapper } from '../../../src/core/set/set.mapper';

describe('CardMapper', () => {
    let cardMapper: CardMapper;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardMapper,
                SetMapper,
            ],
        }).compile();
        cardMapper = module.get<CardMapper>(CardMapper);
    });

    it('should be defined', () => {
        expect(cardMapper).toBeDefined();
    });
});