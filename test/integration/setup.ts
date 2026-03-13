import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.config';
import { join } from 'path';

const VIEWS_DIR = join(process.cwd(), 'src', 'http', 'views');

export const TEST_USER = {
    email: 'integ@test.com',
    password: 'TestPass1!',
};

export const TEST_SET_CODE = 'TST';
export const TEST_CARD_ID = '00000000-0000-4000-a000-000000000001';
export const TEST_CARD_ID_2 = '00000000-0000-4000-a000-000000000002';
export const TEST_CARD_ID_3 = '00000000-0000-4000-a000-000000000003';
export const TEST_CARD_SET_CODE = 'TST';
export const TEST_CARD_NUMBER = '1';

export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    configureApp(app, VIEWS_DIR);

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
