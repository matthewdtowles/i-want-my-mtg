import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "../../../src/http/card/card.mapper";

describe('CardMapper', () => {
    let mapper: CardMapper;
    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardMapper,
            ],
        }).compile();
        mapper = module.get<CardMapper>(CardMapper);
    });

    it('should be defined', () => {
        expect(mapper).toBeDefined();
    });
});