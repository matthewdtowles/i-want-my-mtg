import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MtgJsonIngestionModule } from './mtgjson-ingestion/mtgjson-ingestion.module';
import { HttpModule } from './http/http.module';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';

@Module({
    imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'mysql',
                host: configService.get('DB_HOST'),
                port: configService.get('DB_PORT'),
                username: configService.get('DB_USERNAME'),
                password: configService.get('DB_PASSWORD'),
                database: configService.get('DB_NAME'),
                autoLoadEntities: true,
                synchronize: true,
            }),
            dataSourceFactory: async (options) => {
                return await new DataSource(options).initialize();
            },
        }),
        CoreModule,
        DatabaseModule,
        HttpModule,
        MtgJsonIngestionModule,
    ],
})
export class AppModule { }
