import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "src/core/card/card.mapper";
import { SetDto } from "src/core/set/api/set.dto";
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
    const mockSets: Set[] = testUtils.getMockSets();

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

    it("should be defined", async () => {
        expect(service).toBeDefined();
    });

    it("should save sets and return saved sets", async () => {
        const savedSets: SetDto[] = await service.save(testUtils.getMockCreateSetDtos());
        expect(repository.save).toHaveBeenCalledTimes(1);
        expect(savedSets).toEqual(testUtils.mapSetEntitiesToDtos(mockSets))
    });

    it("should find all sets - cards not included", async () => {
        const foundSets: SetDto[] = await service.findAll();
        expect(repository.findAllSetsMeta).toHaveBeenCalledTimes(1);
        expect(foundSets).toEqual(testUtils.mapSetEntitiesToDtos(mockSets));
    });

    it("should find set with cards by given set code", async () => {
        const foundSetWithCards: SetDto = await service.findByCode(mockSetCode);
        expect(repository.findByCode).toHaveBeenCalledTimes(1);
        expect(foundSetWithCards).toEqual(testUtils.mapSetEntityToDto(mockSets[0]))
    });
});
