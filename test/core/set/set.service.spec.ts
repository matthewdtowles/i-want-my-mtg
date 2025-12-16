import { Test, TestingModule } from "@nestjs/testing";
import { Set } from "src/core/set/set.entity";
import { SetRepositoryPort } from "src/core/set/set.repository.port";
import { SetService } from "src/core/set/set.service";

describe("SetService", () => {
    let service: SetService;
    let repository: SetRepositoryPort;

    const mockSetCode: string = "SET";
    const setCodes: string[] = ["SET", "ETS", "TES"];
    const mockCreateSetDtos: Set[] = Array.from({ length: 3 }, (_, i) => ({
        baseSize: 3,
        block: "Test Set",
        code: setCodes[i],
        imgSrc: null,
        keyruneCode: "set",
        name: "Test Set" + i,
        parentCode: "SET",
        releaseDate: "2022-01-01",
        totalSize: 3,
        type: "expansion",
        url: "sets/" + setCodes[i],
    }));
    const mockSets: Set[] = mockCreateSetDtos.map((dto, i) => ({
        ...dto,
        id: i + 1,
        setCode: dto.code,
        cards: [],
    }));

    const mockSetRepository: SetRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockSets.length),
        findByCode: jest.fn().mockResolvedValue(mockSets[0]),
        delete: jest.fn(),
        findAllSetsMeta: jest.fn(),
        totalSets: jest.fn().mockResolvedValue(mockSets.length),
        totalCards: jest.fn().mockResolvedValue(3), 
        totalCardsInSet: jest.fn().mockResolvedValue(3),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService,
                {
                    provide: SetRepositoryPort,
                    useValue: mockSetRepository,
                },
            ],
        }).compile();
        service = module.get<SetService>(SetService);
        repository = module.get<SetRepositoryPort>(SetRepositoryPort);
    });

    afterEach(() => {
        jest.clearAllMocks()
    });

    it("should save sets and return saved sets", async () => {
        const savedSets: number = await service.save(mockCreateSetDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedSets).toBe(mockCreateSetDtos.length);
    });

    it("should find set with cards by given set code", async () => {
        const foundSetWithCards: Set = await service.findByCode(mockSetCode);
        expect(repository.findByCode).toHaveBeenCalledTimes(1);
        expect(foundSetWithCards.code).toBe(mockSetCode);
        expect(foundSetWithCards.cards).toBeDefined();
    });
});
