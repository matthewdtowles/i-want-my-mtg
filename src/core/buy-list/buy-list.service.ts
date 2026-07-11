import { Inject, Injectable } from '@nestjs/common';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { MAX_IMPORT_ROWS } from 'src/core/import/import.constants';
import { ImportError, ImportResult } from 'src/core/import/import.types';
import { CardImportRow } from 'src/core/inventory/import/inventory-import.types';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';
import { getLogger } from 'src/logger/global-app-logger';
import { BuyListItem } from './buy-list-item.entity';
import { BuyListRepositoryPort } from './ports/buy-list.repository.port';

@Injectable()
export class BuyListService {
    private readonly LOGGER = getLogger(BuyListService.name);

    constructor(
        @Inject(BuyListRepositoryPort) private readonly repository: BuyListRepositoryPort,
        @Inject(CardImportResolver) private readonly cardResolver: CardImportResolver,
        @Inject(TransactionRunnerPort) private readonly txRunner: TransactionRunnerPort
    ) {}

    /** All of a user's buy-list items (with card data), newest first. */
    async list(userId: number): Promise<BuyListItem[]> {
        this.LOGGER.debug(`list buy-list for user ${userId}.`);
        return userId ? await this.repository.findByUser(userId) : [];
    }

    async count(userId: number): Promise<number> {
        return userId ? await this.repository.countByUser(userId) : 0;
    }

    /** Add to the buy-list: increment the quantity, creating the row if absent. */
    async add(userId: number, cardId: string, isFoil: boolean, quantity = 1): Promise<void> {
        this.LOGGER.debug(`add ${quantity} of ${cardId} (foil=${isFoil}) for user ${userId}.`);
        if (quantity <= 0) return;
        await this.repository.increment(userId, cardId, isFoil, quantity);
    }

    /** Set the absolute quantity; quantity <= 0 removes the item. */
    async setQuantity(
        userId: number,
        cardId: string,
        isFoil: boolean,
        quantity: number
    ): Promise<void> {
        this.LOGGER.debug(`setQuantity ${quantity} of ${cardId} (foil=${isFoil}) for ${userId}.`);
        if (quantity <= 0) {
            await this.repository.delete(userId, cardId, isFoil);
            return;
        }
        await this.repository.save(new BuyListItem({ userId, cardId, isFoil, quantity }));
    }

    /**
     * Add `delta` (positive or negative) to the quantity and return the
     * resulting quantity. Positive deltas create the row if absent; a result
     * of 0 or less removes it (returns 0). Decrements lock the row so
     * concurrent adjustments serialize instead of losing updates.
     */
    async adjust(userId: number, cardId: string, isFoil: boolean, delta: number): Promise<number> {
        this.LOGGER.debug(`adjust ${delta} of ${cardId} (foil=${isFoil}) for user ${userId}.`);
        if (delta > 0) {
            return await this.repository.increment(userId, cardId, isFoil, delta);
        }
        return await this.txRunner.run(async () => {
            const item = await this.repository.findOneForUpdate(userId, cardId, isFoil);
            const next = Math.max(0, (item?.quantity ?? 0) + delta);
            if (next === 0) {
                if (item) await this.repository.delete(userId, cardId, isFoil);
                return 0;
            }
            await this.repository.save(new BuyListItem({ userId, cardId, isFoil, quantity: next }));
            return next;
        });
    }

    async remove(userId: number, cardId: string, isFoil: boolean): Promise<void> {
        this.LOGGER.debug(`remove ${cardId} (foil=${isFoil}) for user ${userId}.`);
        await this.repository.delete(userId, cardId, isFoil);
    }

    async clear(userId: number): Promise<void> {
        this.LOGGER.debug(`clear buy-list for user ${userId}.`);
        await this.repository.clear(userId);
    }

    /**
     * Bulk-add parsed CSV rows. Resolves each via CardImportResolver (same
     * identifier rules as inventory import: id, set_code+number, or
     * name+set_code) and increments the quantity; unresolved rows are reported
     * as errors. Row numbers are CSV line numbers (header is line 1).
     */
    async bulkAdd(rows: CardImportRow[], userId: number): Promise<ImportResult> {
        this.LOGGER.debug(`bulkAdd ${rows.length} rows for user ${userId}.`);
        const errors: ImportError[] = [];
        let saved = 0;

        const cappedRows = rows.slice(0, MAX_IMPORT_ROWS);
        if (rows.length > MAX_IMPORT_ROWS) {
            errors.push({
                row: MAX_IMPORT_ROWS + 2,
                error: `List exceeds ${MAX_IMPORT_ROWS} row limit; only first ${MAX_IMPORT_ROWS} processed`,
            });
        }

        for (let i = 0; i < cappedRows.length; i++) {
            const row = cappedRows[i];
            const rowNum = i + 2;

            const { card, error } = await this.cardResolver.resolveCard({
                id: row.id,
                name: row.name,
                set_code: row.set_code,
                set_name: row.set_name,
                number: row.number,
            });
            if (error || !card) {
                errors.push({ row: rowNum, name: row.name, error: error ?? 'Card not found' });
                continue;
            }

            const isFoil = this.cardResolver.resolveFoil(row.foil, card);
            if (isFoil === null) {
                errors.push({
                    row: rowNum,
                    name: row.name ?? card.name,
                    error: 'Card has no non-foil printing and foil=false was specified',
                });
                continue;
            }

            const qty = row.quantity ? parseInt(row.quantity, 10) : 1;
            if (isNaN(qty) || qty < 1) {
                errors.push({
                    row: rowNum,
                    name: row.name ?? card.name,
                    error: 'Invalid quantity',
                });
                continue;
            }

            await this.repository.increment(userId, card.id, isFoil, qty);
            saved++;
        }

        return { saved, skipped: 0, deleted: 0, errors };
    }
}
