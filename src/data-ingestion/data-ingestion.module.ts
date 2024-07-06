import { Module } from '@nestjs/common';
import { DataIngestionController } from './data-ingestion.controller';
import { DataIngestionService } from './data-ingestion.service';
import { DataMapperService } from './data-mapper.service';

@Module({
  controllers: [DataIngestionController],
  providers: [DataIngestionService, DataMapperService]
})
export class DataIngestionModule {}
