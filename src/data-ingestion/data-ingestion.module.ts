import { Module } from '@nestjs/common';
import { DataIngestionService } from './data-ingestion.service';
import { DataMapperService } from './data-mapper.service';
import { DataProviderService } from './data-provider.service';

@Module({
  providers: [
    DataIngestionService, 
    DataMapperService,
    DataProviderService
  ],
  exports: [DataIngestionService]
})
export class DataIngestionModule {}
