import { Test, TestingModule } from "@nestjs/testing";
import { CardController } from "src/adapters/http/card/card.controller";
import { CardService } from "src/core/card";
import { IngestionOrchestrator } from "src/core/ingestion";

describe("CardController", () => {
    let controller: CardController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CardController],
            providers: [
                CardService,
                {
                    provide: IngestionOrchestrator,
                    useValue: {},
                },
            ],
        }).compile();
        controller = module.get<CardController>(CardController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
