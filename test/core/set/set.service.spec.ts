import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "src/core/card/card.mapper";
import { CreateSetDto, SetDto } from "src/core/set/api/set.dto";
import { SetRepositoryPort } from "src/core/set/api/set.repository.port";
import { Set } from "src/core/set/set.entity";
import { SetMapper } from "src/core/set/set.mapper";
import { SetService } from "src/core/set/set.service";
import { TestUtils } from "../../test-utils";

describe("SetService", () => {
    let service: SetService;
    let repository: SetRepositoryPort;

    const testUtils: TestUtils = new TestUtils();
    const mockSetCode: string = "SET";
    const setCodes: string[] = ["SET", "ETS", "TES"];
    const mockCreateSetDtos: CreateSetDto[] = Array.from({ length: 3 }, (_, i) => ({
        baseSize: 3,
        block: "Test Set",
        code: setCodes[i],
        imgSrc: null,
        keyruneCode: "set",
        name: "Test Set" + i,
        parentCode: "SET",
        releaseDate: "2022-01-01",
        type: "expansion",
        url: "sets/" + setCodes[i],
    }));
    const mockSets: Set[] = mockCreateSetDtos.map((dto, i) => ({
        ...dto,
        id: i + 1,
        setCode: dto.code,
        cards: undefined,
    }));

    const mockSetRepository: SetRepositoryPort = {
        save: jest.fn().mockResolvedValue(mockSets),
        findAllSetsMeta: jest.fn().mockResolvedValue(mockSets),
        findByCode: jest.fn().mockResolvedValue(mockSets[0]),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetService,
                {
                    provide: SetRepositoryPort,
                    useValue: mockSetRepository,
                },
                SetMapper,
                CardMapper,
            ],
        }).compile();
        service = module.get<SetService>(SetService);
        repository = module.get<SetRepositoryPort>(SetRepositoryPort);
    });

    afterEach(() => {
        jest.clearAllMocks()
    });

    it("should save sets and return saved sets", async () => {
        const savedSets: SetDto[] = await service.save(mockCreateSetDtos);
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedSets).toHaveLength(mockCreateSetDtos.length);
        savedSets.forEach((set, idx) => {
            expect(set.code).toBe(mockCreateSetDtos[idx].code);
            expect(set.name).toBe(mockCreateSetDtos[idx].name);
        });
    });

    it("should find all sets - cards not included", async () => {
        const foundSets: SetDto[] = await service.findAll();
        expect(repository.findAllSetsMeta).toHaveBeenCalledTimes(1);
        expect(foundSets).toHaveLength(mockSets.length);
        foundSets.forEach((set) => {
            expect(set).toHaveProperty("code");
            expect(set).toHaveProperty("name");
        });
    });

    it("should find set with cards by given set code", async () => {
        const foundSetWithCards: SetDto = await service.findByCode(mockSetCode);
        expect(repository.findByCode).toHaveBeenCalledTimes(1);
        expect(foundSetWithCards.code).toBe(mockSetCode);
        expect(foundSetWithCards.cards).toBeDefined();
    });
});
