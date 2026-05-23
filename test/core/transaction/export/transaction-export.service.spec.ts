import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { TransactionExportService } from 'src/core/transaction/export/transaction-export.service';
import { Transaction, TransactionType } from 'src/core/transaction/transaction.entity';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
    return new Transaction({
        id: 1,
        userId: 1,
        cardId: 'card-1',
        type: 'BUY' as TransactionType,
        quantity: 2,
        pricePerUnit: 5,
        isFoil: false,
        date: new Date('2025-06-01'),
        ...overrides,
    });
}

describe('TransactionExportService', () => {
    let service: TransactionExportService;
    let cardService: { findByIds: jest.Mock };

    beforeAll(async () => {
        cardService = { findByIds: jest.fn() };
        const module: TestingModule = await Test.createTestingModule({
            providers: [TransactionExportService, { provide: CardService, useValue: cardService }],
        }).compile();
        service = module.get(TransactionExportService);
    });

    beforeEach(() => jest.clearAllMocks());

    it('emits a header row and one row per transaction', async () => {
        cardService.findByIds.mockResolvedValue([
            { id: 'card-1', name: 'Lightning Bolt', setCode: 'lea', number: '161' },
        ]);
        const csv = await service.exportToCsv([makeTransaction()]);
        const lines = csv.trim().split('\n');
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe(
            'Date,Type,Card Name,Set,Collector #,Foil,Quantity,Price Per Unit,Total,Fees,Source,Notes'
        );
        expect(lines[1]).toContain('Lightning Bolt');
        expect(lines[1]).toContain('LEA');
        expect(lines[1]).toContain('161');
        expect(lines[1]).toContain('BUY');
    });

    it('quotes embedded commas, quotes, and newlines in card name / source / notes', async () => {
        cardService.findByIds.mockResolvedValue([
            { id: 'card-1', name: 'Yawgmoth, Thran "Physician"', setCode: 'mh2', number: '1' },
        ]);
        const tx = makeTransaction({
            source: 'Local "Game" Store, downtown',
            notes: 'line1\nline2',
        });
        const csv = await service.exportToCsv([tx]);
        expect(csv).toContain('"Yawgmoth, Thran ""Physician"""');
        expect(csv).toContain('"Local ""Game"" Store, downtown"');
        expect(csv).toContain('"line1\nline2"');
    });

    it('prefixes formula-injection patterns with a single quote', async () => {
        cardService.findByIds.mockResolvedValue([
            { id: 'card-1', name: '=cmd|exploit', setCode: 'mh2', number: '1' },
        ]);
        const tx = makeTransaction({ source: '+evil', notes: '@SUM(A1)' });
        const csv = await service.exportToCsv([tx]);
        expect(csv).toContain("'=cmd|exploit");
        expect(csv).toContain("'+evil");
        expect(csv).toContain("'@SUM(A1)");
    });

    it('produces only the header when there are no transactions', async () => {
        cardService.findByIds.mockResolvedValue([]);
        const csv = await service.exportToCsv([]);
        const lines = csv.trim().split('\n');
        expect(lines).toHaveLength(1);
        expect(cardService.findByIds).not.toHaveBeenCalled();
    });
});
