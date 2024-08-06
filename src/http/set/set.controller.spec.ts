import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SetController } from './set.controller';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../app.module';
import { join } from 'path';
import { create } from 'express-handlebars';
import { SetServicePort } from 'src/core/set/ports/set.service.port';

describe('SetController', () => {
    let app: INestApplication;
    let setService = { findByCode: jest.fn() };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            controllers: [SetController],
            providers: [
                {
                    provide: SetServicePort,
                    useValue: setService,
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication<NestExpressApplication>();
        const expressApp = app as NestExpressApplication;

        expressApp.useStaticAssets(join(__dirname, '../../../', 'public'));
        expressApp.setBaseViewsDir(join(__dirname, '../../../', 'views'));

        const hbs = create({
            layoutsDir: join(__dirname, '../../../', 'views', 'layouts'),
            partialsDir: join(__dirname, '../../../', 'views', 'partials'),
            defaultLayout: 'main',
            extname: '.hbs',
        });
        expressApp.engine('hbs', hbs.engine);
        expressApp.setViewEngine('hbs');

        // Mock the service method to return the expected set data
        setService.findByCode.mockResolvedValue({
            keyruneCode: 'kld',
            name: 'Kaladesh',
            block: 'Kaladesh',
            code: 'KLD',
            releaseDate: '2016-09-30',
            cards: [
                {
                    manaCost: ['1', 'w', 'u', 'b', 'r', 'g'],
                    name: 'the name of the card',
                    number: 1,
                    price: 0.07,
                    rarity: 'common',
                    totalOwned: 0,
                    url: 'some.url/set/kld/1',
                },
                {
                    manaCost: ['10', 'wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rw', 'rg', 'gw', 'gu'],
                    name: 'the second card',
                    number: 2,
                    price: 3.14,
                    rarity: 'rare',
                    totalOwned: 1,
                    url: 'some.url/set/kld/2',
                }
            ]
        });

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should render set template with mana.css cdn link', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        expect(response.text).toContain('<link href="//cdn.jsdelivr.net/npm/mana-font@latest/css/mana.css" rel="stylesheet" type="text/css" />');
    });

    it('should render setInfo partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        expect(response.text).toContain('<i class="ss ss-kld ss-2x"></i>');
        expect(response.text).toContain('<span id="set-name">Kaladesh</span>');
        expect(response.text).toContain('<li id="set-metadata-block">Block: Kaladesh</li>');
        expect(response.text).toContain('<li id="set-metadata-code">Code: KLD</li>');
        expect(response.text).toContain('<li id="set-metadata-release-date">Release Date: 2016-09-30</li>');
    });

    it('should render setCards partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        expect(response.text).toContain('<td class="card-set-card-number">1</td>');
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/1">the name of the card</a>');
        expect(response.text).toContain('<td class="card-set-card-rarity">common</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$0.07</td>');

        expect(response.text).toContain('<td class="card-set-card-number">2</td>');
        expect(response.text).toContain('<a class="card-set-card-link" href="some.url/set/kld/2">the second card</a>');
        expect(response.text).toContain('<td class="card-set-card-rarity">rare</td>');
        expect(response.text).toContain('<td class="card-set-card-price">$3.14</td>');      
    });

    it('should render manaCost partial with every mana symbol element from mocks', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);

        // card 1
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-1"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-w"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-u"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-b"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-r"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-g"></i>');

        // card 2
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-10"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-wu"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-wb"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-ub"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-ur"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-br"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-bg"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-rw"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-rg"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-gw"></i>');
        expect(response.text).toContain('<i class="ms ms-cost ms-shadow ms-gu"></i>');
    });

    it('should render cardsOwned partial with context', async () => {
        const response = await request(app.getHttpServer()).get('/sets/kld').expect(200);
        // card 1
        expect(response.text).toContain('<span class="total-owned">0</span>');
        // 2
        expect(response.text).toContain('<span class="total-owned">1</span>');
    });
});
