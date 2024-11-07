import { Test, TestingModule } from "@nestjs/testing";
import { CardController } from "src/adapters/http/card.controller";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { CardMapper } from "src/core/card/card.mapper";
import { IngestionOrchestratorPort } from "src/core/ingestion/api/ingestion.orchestrator.port";

describe("CardController", () => {
    let controller: CardController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardController],
            providers: [
                CardMapper,
                {
                    provide: CardServicePort,
                    useValue: {},
                },
                {
                    provide: IngestionOrchestratorPort,
                    useValue: {},
                },
                {
                    provide: AggregatorServicePort,
                    useValue: {},
                }
            ],
        }).compile();
        controller = module.get<CardController>(CardController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
