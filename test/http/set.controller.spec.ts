import { Test, TestingModule } from '@nestjs/testing';
import { SetController } from 'src/adapters/http/set.controller';
import { AggregatorServicePort } from 'src/core/aggregator/api/aggregator.service.port';
import { SetServicePort } from 'src/core/set/api/set.service.port';

describe('SetController', () => {
    let controller: SetController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [
                {
                    provide: SetServicePort,
                    useValue: {},
                },
                {
                    provide: AggregatorServicePort,
                    useValue: {},
                },
            ],
        }).compile();
        controller = module.get<SetController>(SetController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});