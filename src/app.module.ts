import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { buildTypeOrmOptions } from './database/typeorm-options';
import { HttpModule } from './http/http.module';
import { McpModule } from './mcp/mcp.module';
import { getLogger } from './logger/global-app-logger';

@Module({
    imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: buildTypeOrmOptions,
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
