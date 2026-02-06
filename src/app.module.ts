import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { HttpModule } from './http/http.module';
import { getLogger } from './logger/global-app-logger';

@Module({
    imports: [
        ConfigModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'src', 'http', 'public'),
            serveRoot: '/public',
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const databaseUrl = configService.get<string>('DATABASE_URL');

                if (databaseUrl) {
                    return {
                        type: 'postgres',
                        url: databaseUrl,
                        autoLoadEntities: true,
                        synchronize: false,
                        dropSchema: false,
                        migrationsRun: false,
                        logging:
                            configService.get('NODE_ENV') !== 'production'
                                ? ['error', 'warn']
                                : ['error'],
                        extra: {
                            connectionLimit: 10,
                            queueLimit: 0,
                            waitForConnections: true,
                        },
                    };
                } else {
                    return {
                        type: 'postgres',
                        host: configService.get<string>('DB_HOST'),
                        port: configService.get<number>('DB_PORT'),
                        username: configService.get<string>('DB_USERNAME'),
                        password: configService.get<string>('DB_PASSWORD'),
                        database: configService.get<string>('DB_NAME'),
                        autoLoadEntities: true,
                        synchronize: false,
                        dropSchema: false,
                        migrationsRun: false,
                        logging:
                            configService.get('NODE_ENV') !== 'production'
                                ? ['error', 'warn']
                                : ['error'],
                        extra: {
                            connectionLimit: 10,
                            queueLimit: 0,
                            waitForConnections: true,
                        },
                    };
                }
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
    ],
})
export class AppModule {
    private readonly LOGGER = getLogger(AppModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
