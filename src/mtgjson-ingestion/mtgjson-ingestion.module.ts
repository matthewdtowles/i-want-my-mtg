import { Module } from '@nestjs/common';
import { MtgJsonIngestionService } from './mtgjson-ingestion.service';
import { MtgJsonMapperService } from './mtgjson-mapper.service';

@Module({
  providers: [
    MtgJsonIngestionService, 
    MtgJsonMapperService,
  ],
  exports: [
    MtgJsonIngestionService
  ]
})
export class MtgJsonIngestionModule {}
