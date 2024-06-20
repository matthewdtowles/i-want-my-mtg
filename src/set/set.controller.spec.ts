import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SetController } from './set.controller';
import { SetService } from './set.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module';
import { join } from 'path';
import { create } from 'express-handlebars';

describe('SetController', () => {
  let app: INestApplication;
  let setService = { findByCode: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SetController],
      providers: [
        {
          provide: SetService,
          useValue: setService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    const expressApp = app as NestExpressApplication;

    // expressApp.useStaticAssets(join(__dirname, '..', 'public'));
    // expressApp.setBaseViewsDir(join(__dirname, '..', 'views'));
    // expressApp.setViewEngine('hbs');
    // await app.init();
    // app = moduleFixture.create<NestExpressApplication>(NestExpressApplication);

    expressApp.useStaticAssets(join(__dirname, '../../', 'public'));
    expressApp.setBaseViewsDir(join(__dirname, '../../', 'views'));

    const hbs = create({
      layoutsDir: join(__dirname, '../../', 'views', 'layouts'),
      partialsDir: join(__dirname, '../../', 'views', 'partials'),
      defaultLayout: 'main',
      extname: '.hbs',
    });
    expressApp.engine('hbs', hbs.engine);
    expressApp.setViewEngine('hbs');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should render template with context', async () => {
    // Mock the service method to return the expected set data
    setService.findByCode.mockResolvedValue({
      keyRuneCode: 'KLD',
      name: 'Kaladesh',
      block: 'Kaladesh',
      code: 'KLD',
      releaseDate: '2016-09-30',
      cards: [
        {
          manaCost: ['1', 'W', 'W'],
          name: 'the name of the card',
          number: 1,
          price: 0.07,
          rarity: 'common',
          totalOwned: 0,
          url: 'some.url/set/kld/1',
        },
        {
          manaCost: ['10', 'U', 'B', 'R', 'G', 'W/G'],
          name: 'the second card',
          number: 2,
          price: 3.14,
          rarity: 'rare',
          totalOwned: 1,
          url: 'some.url/set/kld/2',
        }
      ]
    });

    const response = await request(app.getHttpServer())
      .get('/sets/KLD');
      // .expect(200);

    expect(response.text).toContain('<i class="ss ss-kld ss-2x"></i>');
  });
});
