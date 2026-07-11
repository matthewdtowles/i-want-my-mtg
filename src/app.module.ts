import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { HttpModule } from './http/http.module';
import { McpModule } from './mcp/mcp.module';
import { getLogger } from './logger/global-app-logger';

@Module({
    imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get('NODE_ENV') === 'production';
                // The two connection styles differ only in how the server is
                // addressed; everything else (ssl, logging, pool) is shared.
                const shared = {
                    type: 'postgres' as const,
                    autoLoadEntities: true,
                    synchronize: false,
                    dropSchema: false,
                    migrationsRun: false,
                    logging: (!isProduction ? ['error', 'warn'] : ['error']) as (
                        | 'error'
                        | 'warn'
                    )[],
                    ...(isProduction && { ssl: { rejectUnauthorized: false } }),
                    // pg.Pool options (the previous connectionLimit/queueLimit/
                    // waitForConnections were mysql2 keys that pg silently ignored).
                    extra: {
                        max: 10,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 10000,
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
            },
            dataSourceFactory: async (options) => {
                try {
                    return await new DataSource(options).initialize();
                } catch (error) {
                    console.error('Error initializing the database connection:', error);
                    throw error;
                }
            },
        }),
        DatabaseModule,
        HttpModule,
        McpModule,
    ],
})
export class AppModule {
    private readonly LOGGER = getLogger(AppModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
