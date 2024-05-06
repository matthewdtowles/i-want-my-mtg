import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SetsController } from './sets/sets.controller';
import { SetsService } from './sets/sets.service';

@Module({
  imports: [],
  controllers: [AppController, SetsController],
  providers: [AppService, SetsService],
})
export class AppModule {}
