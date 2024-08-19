import { Injectable } from "@nestjs/common";
import { IngestionServicePort } from "./ingestion.service.port";

@Injectable()
export class IngestionOrchestrator {
    constructor(private readonly ingestionService: IngestionServicePort) {}

    async orchestrateIngestion(): Promise<void> {
        const data = await this.ingestionService.fetchAllSetsMeta();
        // const processedData = this.ingestionService.processData(data);
        // Additional business logic
    }
}
