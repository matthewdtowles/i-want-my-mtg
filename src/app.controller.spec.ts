import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetService } from './set/set.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, SetService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('appController.getIndex() should not be undefined', () => {
      expect(appController.getIndex()).toBeDefined();
    });
  });
});
