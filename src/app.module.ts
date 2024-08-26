import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CoreModule } from './core/core.module';
import { AdapterModule } from './adapters/adapter.module';
import { CommandModule } from 'nestjs-command';

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
                dropSchema: true,
                logging: configService.get('NODE_ENV') !== 'production' ? 'all' : ['error'],
            }),
            dataSourceFactory: async (options) => {
                return await new DataSource(options).initialize();
            },
        }),
        CoreModule,
        AdapterModule,
        CommandModule,
    ],
})
export class AppModule {
    private readonly LOGGER: Logger = new Logger(AppModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
