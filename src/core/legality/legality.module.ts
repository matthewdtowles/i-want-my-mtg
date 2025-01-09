import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/adapters/database/database.module";
import { LegalityRepository } from "src/adapters/database/legality.repository";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { LegalityRepositoryPort } from "src/core/legality/api/legality.repository.port";
import { LegalityServicePort } from "src/core/legality/api/legality.service.port";
import { LegalityMapper } from "src/core/legality/legality.mapper";
import { LegalityService } from "src/core/legality/legality.service";

@Module({
    imports: [DatabaseModule, MtgJsonIngestionModule],
    providers: [
        { provide: LegalityServicePort, useClass: LegalityService },
        { provide: LegalityRepositoryPort, useClass: LegalityRepository },
        LegalityMapper
    ],
})
export class LegalityModule {
    private readonly LOGGER: Logger = new Logger(LegalityModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}