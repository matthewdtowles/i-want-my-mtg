import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { create } from 'express-handlebars';
import { join } from 'path';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { HttpExceptionFilter } from 'src/http/http.exception.filter';

const VIEWS_DIR = join(process.cwd(), 'src', 'http', 'views');

export const TEST_USER = {
    email: 'integ@test.com',
    password: 'TestPass1!',
};

export const TEST_SET_CODE = 'TST';
export const TEST_CARD_ID = 'test-card-001';
export const TEST_CARD_SET_CODE = 'TST';
export const TEST_CARD_NUMBER = '1';

export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestExpressApplication>();

    app.useStaticAssets(join(process.cwd(), 'src', 'http', 'public'), {
        prefix: '/public/',
    });
    app.setBaseViewsDir(VIEWS_DIR);

    const hbs = create({
        layoutsDir: join(VIEWS_DIR, 'layouts'),
        partialsDir: join(VIEWS_DIR, 'partials'),
        defaultLayout: 'main',
        extname: '.hbs',
        helpers: {
            toUpperCase: (str: string) => str?.toUpperCase(),
            toLowerCase: (str: string) => str?.toLowerCase(),
            capitalize: (str: string) => str?.charAt(0).toUpperCase() + str?.slice(1),
            eq: (a: any, b: any) => a === b,
            gt: (a: any, b: any) => a > b,
            lt: (a: any, b: any) => a < b,
            encodeURIComponent: (str: string) => encodeURIComponent(str || ''),
        },
    });
    app.engine('hbs', hbs.engine);
    app.setViewEngine('hbs');
    app.use(cookieParser());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
        })
    );

    await app.init();
    return app;
}

/**
 * Close the test app and ensure the TypeORM DataSource is destroyed.
 * Prevents connection pool leaks between test suites.
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
    if (!app) return;
    try {
        const ds = app.get(DataSource);
        if (ds?.isInitialized) {
            await ds.destroy();
        }
    } catch {
        // DataSource may already be destroyed
    }
    await app.close().catch(() => {});
}

/**
 * Login as test user and return the auth cookie string.
 */
export async function loginTestUser(app: INestApplication): Promise<string> {
    const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(302);

    const cookies = res.headers['set-cookie'];
    const authCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) =>
        c?.startsWith('authorization=')
    );
    if (!authCookie) {
        throw new Error('Login did not return auth cookie');
    }
    return authCookie.split(';')[0];
}
