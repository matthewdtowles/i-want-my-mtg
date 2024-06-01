import { Test, TestingModule } from '@nestjs/testing';
import { SetController as SetController } from './set.controller';
import { SetService } from './set.service';

describe('SetsController', () => {
  let controller: SetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [SetService]
    }).compile();

    controller = module.get<SetController>(SetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
