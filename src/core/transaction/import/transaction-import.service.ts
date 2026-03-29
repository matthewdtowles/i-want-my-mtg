import { Inject, Injectable } from '@nestjs/common';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { ImportError, ImportResult } from 'src/core/import/import.types';
import { getLogger } from 'src/logger/global-app-logger';
import { Transaction, TransactionType } from '../transaction.entity';
import { TransactionService } from '../transaction.service';
import { TransactionImportRow } from './transaction-import.types';

const MAX_ROWS = 2000;
const VALID_TYPES = new Set<string>(['BUY', 'SELL']);

@Injectable()
export class TransactionImportService {
    private readonly LOGGER = getLogger(TransactionImportService.name);

    constructor(
        @Inject(CardImportResolver)
        private readonly cardResolver: CardImportResolver,
        @Inject(TransactionService)
        private readonly transactionService: TransactionService
    ) {}

    async importTransactions(
        rows: TransactionImportRow[],
        userId: number
    ): Promise<ImportResult> {
        this.LOGGER.debug(`importTransactions: ${rows.length} rows for user ${userId}.`);

        const errors: ImportError[] = [];
        let saved = 0;

        const cappedRows = rows.slice(0, MAX_ROWS);
        if (rows.length > MAX_ROWS) {
            errors.push({
                row: MAX_ROWS + 2,
                error: `File exceeds ${MAX_ROWS} row limit; only first ${MAX_ROWS} rows processed`,
            });
        }

        for (let i = 0; i < cappedRows.length; i++) {
            const row = cappedRows[i];
            const rowNum = i + 2;

            const { card, error: cardError } = await this.cardResolver.resolveCard({
                id: row.id,
                name: row.name,
                set_code: row.set_code,
                number: row.number,
            });

            if (cardError || !card) {
                errors.push({
                    row: rowNum,
                    name: row.name,
                    set_code: row.set_code,
                    number: row.number,
                    error: cardError ?? 'Card not found',
                });
                continue;
            }

            const isFoil = this.cardResolver.resolveFoil(row.foil, card);
            if (isFoil === null) {
                errors.push({
                    row: rowNum,
                    name: row.name ?? card.name,
                    set_code: row.set_code ?? card.setCode,
                    number: row.number ?? card.number,
                    error: `Card has no non-foil printing and foil=false was specified`,
                });
                continue;
            }

            const validationError = this.validateRow(row, rowNum);
            if (validationError) {
                errors.push(validationError);
                continue;
            }

            const type = row.type.trim().toUpperCase() as TransactionType;
            const quantity = Number(row.quantity.trim());
            const pricePerUnit = Number(row.price_per_unit.trim());
            const date = new Date(row.date);
            const fees =
                row.fees !== undefined && row.fees !== '' ? Number(row.fees.trim()) : undefined;
            const source =
                row.source !== undefined && row.source !== '' ? row.source.trim() : undefined;
            const notes =
                row.notes !== undefined && row.notes !== '' ? row.notes.trim() : undefined;

            try {
                await this.transactionService.create(
                    new Transaction({
                        userId,
                        cardId: card.id,
                        type,
                        quantity,
                        pricePerUnit,
                        isFoil,
                        date,
                        source,
                        fees,
                        notes,
                    }),
                    undefined
                );
                saved++;
            } catch (e) {
                errors.push({
                    row: rowNum,
                    name: row.name ?? card.name,
                    set_code: row.set_code ?? card.setCode,
                    number: row.number ?? card.number,
                    error: e.message,
                });
            }
        }

        this.LOGGER.debug(
            `importTransactions complete: saved=${saved}, errors=${errors.length}.`
        );

        return { saved, skipped: 0, deleted: 0, errors };
    }

    private validateRow(row: TransactionImportRow, rowNum: number): ImportError | null {
        const baseFields = {
            row: rowNum,
            name: row.name,
            set_code: row.set_code,
            number: row.number,
        };

        if (!row.type || row.type.trim() === '') {
            return { ...baseFields, error: 'Missing type: must be BUY or SELL' };
        }
        if (!VALID_TYPES.has(row.type.trim().toUpperCase())) {
            return {
                ...baseFields,
                error: `Invalid type must be BUY or SELL: "${row.type}"`,
            };
        }

        if (row.quantity === undefined || row.quantity === '') {
            return { ...baseFields, error: 'Missing quantity' };
        }
        if (!/^\d+$/.test(row.quantity.trim())) {
            return { ...baseFields, error: `Invalid quantity (must be a whole number): "${row.quantity}"` };
        }
        const qty = Number(row.quantity.trim());
        if (!Number.isInteger(qty) || qty <= 0) {
            return { ...baseFields, error: 'Quantity must be a positive integer' };
        }

        if (row.price_per_unit === undefined || row.price_per_unit === '') {
            return { ...baseFields, error: 'Missing price_per_unit' };
        }
        const price = Number(row.price_per_unit.trim());
        if (!Number.isFinite(price)) {
            return { ...baseFields, error: `Invalid price_per_unit: "${row.price_per_unit}"` };
        }
        if (price < 0) {
            return { ...baseFields, error: 'Price per unit cannot be negative' };
        }

        if (!row.date || row.date.trim() === '') {
            return { ...baseFields, error: 'Missing date' };
        }
        const date = new Date(row.date);
        if (isNaN(date.getTime())) {
            return { ...baseFields, error: `Invalid date: "${row.date}"` };
        }

        if (row.fees !== undefined && row.fees !== '') {
            const fees = Number(row.fees.trim());
            if (!Number.isFinite(fees)) {
                return { ...baseFields, error: `Invalid fees: "${row.fees}"` };
            }
        }

        return null;
    }
}
