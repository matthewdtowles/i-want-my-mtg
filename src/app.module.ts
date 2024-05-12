import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetsController } from './sets/sets.controller';
import { SetsService } from './sets/sets.service';
import { ConfigModule } from './config/config.module';
import { SetsModule } from './sets/sets.module';

@Module({
  imports: [ConfigModule, SetsModule],
  controllers: [AppController, SetsController],
  providers: [AppService, SetsService],
})
export class AppModule {}
