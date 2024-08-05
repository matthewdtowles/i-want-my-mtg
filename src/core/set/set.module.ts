import { Module } from '@nestjs/common';
import { SetService } from './set.service';
import { SetServicePort } from './ports/set.service.port';
import { SetRepositoryPort } from './ports/set.repository.port';
import { SetDataIngestionPort } from './ports/set-data.ingestion.port';

@Module({
    providers: [
        {
            provide: SetServicePort,
            useClass: SetService,
        },
    ],
    exports: [
        SetDataIngestionPort,
        SetRepositoryPort,
        SetServicePort,
    ]
})
export class SetModule { }
