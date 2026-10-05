import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
    const isProduction = configService.get('NODE_ENV') === 'production';
    // The two connection styles differ only in how the server is
    // addressed; everything else (ssl, logging, pool) is shared.
    const shared = {
        type: 'postgres' as const,
        autoLoadEntities: true,
        synchronize: false,
        dropSchema: false,
        migrationsRun: false,
        logging: (!isProduction ? ['error', 'warn'] : ['error']) as ('error' | 'warn')[],
        ...(isProduction && { ssl: { rejectUnauthorized: false } }),
        // pg.Pool options (the previous connectionLimit/queueLimit/
        // waitForConnections were mysql2 keys that pg silently ignored).
        extra: {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            // On 2026-10-05 the managed DB was restarted mid-query and the
            // close never reached us. All 10 clients sat on dead sockets
            // waiting for replies, the pool never freed a slot, and every
            // request 500'd for two hours until the container was restarted.
            // A keepalive probe on a dead socket gets a reset, which errors
            // the client and lets the pool replace it.
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            // The same morning, queries slowed by an overloaded DB held all
            // 10 slots for 40 minutes before the restart. Bound each one so
            // a slow DB degrades pages instead of starving the pool.
            // query_timeout is the client-side backstop for when the
            // server cannot deliver its own cancel.
            statement_timeout: 30000,
            query_timeout: 35000,
        },
    };

    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (databaseUrl) {
        // Remove sslmode from URL - pg treats 'require' as 'verify-full'
        // which rejects AWS managed DB certs. We handle SSL via TypeORM config instead.
        const url = new URL(databaseUrl);
        url.searchParams.delete('sslmode');
        return { ...shared, url: url.toString() };
    }
    return {
        ...shared,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
    };
}
