import { Test, TestingModule } from '@nestjs/testing';
import { SetMapper } from '../../../src/core/set/set.mapper';
import { CardMapper } from '../../../src/core/card/card.mapper';

describe('SetMapper', () => {
    let mapper: SetMapper;
    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetMapper,
                CardMapper,
            ],
        }).compile();
        mapper = module.get<SetMapper>(SetMapper);
    });

    it('should be defined', () => {
        expect(mapper).toBeDefined();
    });
});