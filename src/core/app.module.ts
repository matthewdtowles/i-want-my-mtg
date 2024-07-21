import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetController } from './set/set.controller';
import { SetService } from './set/set.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SetModule } from './set/set.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserModule } from './users/user.module';
import { CardModule } from './card/card.module';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';

@Module({
  imports: [
    ConfigModule.forRoot(), 
    SetModule,
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
        const dataSource = await new DataSource(options).initialize();
        return dataSource;
      },
    }),
    UserModule,
    CardModule,
    DataIngestionModule,
  ],
  controllers: [AppController, SetController],
  providers: [AppService, SetService],
})
export class AppModule {}
