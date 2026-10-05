import { ConfigService } from '@nestjs/config';
import { buildTypeOrmOptions } from 'src/database/typeorm-options';

function configWith(values: Record<string, string>): ConfigService {
    return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('buildTypeOrmOptions', () => {
    describe('pool options', () => {
        const extra = (
            buildTypeOrmOptions(configWith({ DATABASE_URL: 'postgres://u:p@db:5432/x' })) as any
        ).extra;

        it('probes idle sockets so a connection the server dropped is detected', () => {
            expect(extra.keepAlive).toBe(true);
            expect(extra.keepAliveInitialDelayMillis).toBe(10000);
        });

        it('has the server cancel any statement after 30s', () => {
            expect(extra.statement_timeout).toBe(30000);
        });

        it('gives up client-side shortly after the server would have cancelled', () => {
            expect(extra.query_timeout).toBeGreaterThan(extra.statement_timeout);
            expect(extra.query_timeout).toBe(35000);
        });

        it('keeps the existing pool size and wait limits', () => {
            expect(extra).toMatchObject({
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
            });
        });
    });

    it('drops sslmode from DATABASE_URL and enables ssl in production', () => {
        const options = buildTypeOrmOptions(
            configWith({
                NODE_ENV: 'production',
                DATABASE_URL: 'postgres://u:p@db:5432/x?sslmode=require',
            })
        ) as any;

        expect(options.url).toBe('postgres://u:p@db:5432/x');
        expect(options.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('uses the individual DB_* settings when DATABASE_URL is unset', () => {
        const options = buildTypeOrmOptions(
            configWith({ DB_HOST: 'localhost', DB_NAME: 'mtg' })
        ) as any;

        expect(options.url).toBeUndefined();
        expect(options.host).toBe('localhost');
        expect(options.database).toBe('mtg');
        expect(options.extra.keepAlive).toBe(true);
    });
});
