import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { InventoryExportService } from 'src/core/inventory/export/inventory-export.service';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';

function makeInventory(overrides: Partial<Inventory> = {}): Inventory {
    const card = new Card({
        id: overrides.cardId ?? 'card-uuid-1',
        imgSrc: 'img.jpg',
        legalities: [],
        name: 'Teferi',
        number: '1',
        rarity: CardRarity.Rare,
        setCode: 'dmu',
        sortNumber: '0001',
        type: 'Planeswalker',
    });

    return new Inventory({
        cardId: 'card-uuid-1',
        userId: 1,
        isFoil: false,
        quantity: 2,
        card,
        ...overrides,
    });
}

describe('InventoryExportService', () => {
    let service: InventoryExportService;
    let inventoryRepo: jest.Mocked<InventoryRepositoryPort>;

    const mockInventoryRepo = {
        findAllForExport: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        findByCard: jest.fn(),
        findByCards: jest.fn(),
        findByUser: jest.fn(),
        delete: jest.fn(),
        ensureAtLeastOne: jest.fn(),
        totalCards: jest.fn(),
        totalInventoryCards: jest.fn(),
        totalInventoryValue: jest.fn(),
        totalInventoryValueForSet: jest.fn(),
        totalInventoryCardsForSet: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryExportService,
                { provide: InventoryRepositoryPort, useValue: mockInventoryRepo },
            ],
        }).compile();

        service = module.get<InventoryExportService>(InventoryExportService);
        inventoryRepo = module.get(InventoryRepositoryPort);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('exportToCsv', () => {
        it('produces CSV with correct headers', async () => {
            mockInventoryRepo.findAllForExport.mockResolvedValue([makeInventory()]);

            const csv = await service.exportToCsv(1);

            expect(csv).toContain('id,name,set_code,number,quantity,foil');
        });

        it('includes correct data row', async () => {
            const item = makeInventory({ quantity: 3, isFoil: true });
            mockInventoryRepo.findAllForExport.mockResolvedValue([item]);

            const csv = await service.exportToCsv(1);
            const lines = csv.trim().split('\n');

            expect(lines.length).toBe(2); // header + 1 data row
            expect(lines[1]).toContain('card-uuid-1');
            expect(lines[1]).toContain('Teferi');
            expect(lines[1]).toContain('dmu');
            expect(lines[1]).toContain('3');
            expect(lines[1]).toContain('true');
        });

        it('returns header-only CSV when inventory is empty', async () => {
            mockInventoryRepo.findAllForExport.mockResolvedValue([]);

            const csv = await service.exportToCsv(1);
            const lines = csv.trim().split('\n');

            expect(lines).toHaveLength(1);
            expect(lines[0]).toContain('id,name,set_code,number,quantity,foil');
        });

        it('export is round-trip compatible (id field present)', async () => {
            const item = makeInventory();
            mockInventoryRepo.findAllForExport.mockResolvedValue([item]);

            const csv = await service.exportToCsv(1);
            const [header, dataRow] = csv.trim().split('\n');
            const cols = header.split(',');
            const vals = dataRow.split(',');
            const row = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));

            expect(row.id).toBe('card-uuid-1');
            expect(row.set_code).toBe('dmu');
            expect(row.foil).toBe('false');
        });
    });
});
