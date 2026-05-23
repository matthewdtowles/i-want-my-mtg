import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { CardService } from 'src/core/card/card.service';
import { getLogger } from 'src/logger/global-app-logger';
import { Transaction } from '../transaction.entity';

const CSV_COLUMNS = [
    'Date',
    'Type',
    'Card Name',
    'Set',
    'Collector #',
    'Foil',
    'Quantity',
    'Price Per Unit',
    'Total',
    'Fees',
    'Source',
    'Notes',
] as const;

/** Card lookups needed to denormalize transaction rows for CSV output. */
interface CardLookup {
    name: string;
    setCode: string;
    number: string;
}

/**
 * Prepends a single-quote to fields starting with =, +, -, or @ so spreadsheet
 * apps don't execute them as formulas (CSV-injection mitigation). CSV quoting
 * of commas, quotes, and newlines is left to csv-stringify, which handles it
 * correctly when given raw strings.
 */
function neutralizeFormula(value: string): string {
    // Intentionally matches leading control characters: attackers can hide a
    // dangerous prefix behind \x00 etc. and trick a spreadsheet into still
    // executing the formula.
    // eslint-disable-next-line no-control-regex
    if (/^[\s\x00-\x1f]*[=+\-@]/.test(value)) {
        return "'" + value;
    }
    return value;
}

function formatDate(date: Date): string {
    return new Date(date).toISOString().slice(0, 10);
}

@Injectable()
export class TransactionExportService {
    private readonly LOGGER = getLogger(TransactionExportService.name);

    constructor(@Inject(CardService) private readonly cardService: CardService) {}

    async exportToCsv(transactions: Transaction[]): Promise<string> {
        this.LOGGER.debug(`exportToCsv: ${transactions.length} transactions.`);

        const cardIds = [...new Set(transactions.map((t) => t.cardId))];
        const cardMap = await this.buildCardMap(cardIds);

        const rows = transactions.map((t) => {
            const card = cardMap.get(t.cardId);
            const total = t.quantity * t.pricePerUnit;
            return {
                Date: formatDate(t.date),
                Type: t.type,
                'Card Name': neutralizeFormula(card?.name || ''),
                Set: card?.setCode?.toUpperCase() || '',
                'Collector #': card?.number || '',
                Foil: t.isFoil ? 'Yes' : 'No',
                Quantity: String(t.quantity),
                'Price Per Unit': t.pricePerUnit.toFixed(2),
                Total: total.toFixed(2),
                Fees: t.fees != null ? t.fees.toFixed(2) : '',
                Source: neutralizeFormula(t.source || ''),
                Notes: neutralizeFormula(t.notes || ''),
            };
        });

        return new Promise((resolve, reject) => {
            stringify(
                rows,
                { header: true, columns: CSV_COLUMNS as unknown as string[] },
                (err, output) => (err ? reject(err) : resolve(output))
            );
        });
    }

    private async buildCardMap(cardIds: string[]): Promise<Map<string, CardLookup>> {
        const map = new Map<string, CardLookup>();
        if (cardIds.length === 0) return map;
        const cards = await this.cardService.findByIds(cardIds);
        for (const card of cards) {
            map.set(card.id, { name: card.name, setCode: card.setCode, number: card.number });
        }
        return map;
    }
}
