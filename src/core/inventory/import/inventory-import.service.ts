import { Inject, Injectable } from '@nestjs/common';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { MAX_IMPORT_ROWS } from 'src/core/import/import.constants';
import { ImportError, ImportResult, parseBool } from 'src/core/import/import.types';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Set } from 'src/core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';
import { getLogger } from 'src/logger/global-app-logger';
import { InventoryRepositoryPort } from '../ports/inventory.repository.port';
import { CardImportRow, SetImportRow } from './inventory-import.types';

@Injectable()
export class InventoryImportService {
    private readonly LOGGER = getLogger(InventoryImportService.name);

    constructor(
        @Inject(InventoryRepositoryPort)
        private readonly inventoryRepository: InventoryRepositoryPort,
        @Inject(CardRepositoryPort)
        private readonly cardRepository: CardRepositoryPort,
        @Inject(SetRepositoryPort)
        private readonly setRepository: SetRepositoryPort,
        @Inject(CardImportResolver)
        private readonly cardResolver: CardImportResolver,
        @Inject(TransactionRunnerPort)
        private readonly txRunner: TransactionRunnerPort
    ) {}

    async importCards(rows: CardImportRow[], userId: number): Promise<ImportResult> {
        this.LOGGER.debug(`importCards: ${rows.length} rows for user ${userId}.`);

        const errors: ImportError[] = [];
        const toEnsure: Array<{ cardId: string; userId: number; isFoil: boolean }> = [];
        const toSave: Array<{ cardId: string; userId: number; isFoil: boolean; quantity: number }> =
            [];
        const toDelete: Array<{ cardId: string; userId: number; isFoil: boolean }> = [];

        const cappedRows = rows.slice(0, MAX_IMPORT_ROWS);
        if (rows.length > MAX_IMPORT_ROWS) {
            errors.push({
                row: MAX_IMPORT_ROWS + 2,
                error: `File exceeds ${MAX_IMPORT_ROWS} row limit; only first ${MAX_IMPORT_ROWS} rows processed`,
            });
        }

        // Resolve every row up front in a handful of bulk queries instead of one
        // or two per row (P1: a full 2000-row import was 2000+ serial queries).
        const resolved = await this.cardResolver.resolveCards(
            cappedRows.map((row) => ({
                id: row.id,
                name: row.name,
                set_code: row.set_code,
                set_name: row.set_name,
                number: row.number,
            }))
        );

        for (let i = 0; i < cappedRows.length; i++) {
            const row = cappedRows[i];
            const rowNum = i + 2;

            const { card, error: cardError } = resolved[i];

            if (cardError || !card) {
                errors.push({
                    row: rowNum,
                    name: row.name,
                    set_code: row.set_code,
                    number: row.number,
                    quantity: row.quantity,
                    foil: row.foil,
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
                    quantity: row.quantity,
                    foil: row.foil,
                    error: `Card has no non-foil printing and foil=false was specified`,
                });
                continue;
            }

            const hasQuantity = row.quantity !== undefined && row.quantity !== '';
            if (hasQuantity) {
                const qty = parseInt(row.quantity, 10);
                if (isNaN(qty) || qty < 0) {
                    errors.push({
                        row: rowNum,
                        name: row.name ?? card.name,
                        set_code: row.set_code ?? card.setCode,
                        number: row.number ?? card.number,
                        quantity: row.quantity,
                        foil: row.foil,
                        error: `Invalid quantity: "${row.quantity}"`,
                    });
                    continue;
                }
                if (qty === 0) {
                    toDelete.push({ cardId: card.id, userId, isFoil });
                } else {
                    toSave.push({ cardId: card.id, userId, isFoil, quantity: qty });
                }
            } else {
                toEnsure.push({ cardId: card.id, userId, isFoil });
            }
        }

        // Apply the deletes, exact saves, and ensure-at-least-one as one unit
        // of work (W2/B4): if any phase fails the whole import rolls back rather
        // than leaving rows deleted-but-not-saved. Row *resolution* errors
        // gathered above are pre-write and returned regardless; only the DB
        // writes are transactional. (A single transaction can't tolerate a
        // mid-batch delete failure — the first error poisons it — so a failed
        // delete now aborts the import instead of being skipped.)
        const { deleted, exactSaved, ensureResult } = await this.txRunner.run(async () => {
            for (const item of toDelete) {
                await this.inventoryRepository.delete(item.userId, item.cardId, item.isFoil);
            }

            let exactSaved = 0;
            if (toSave.length > 0) {
                const { Inventory } = await import('../inventory.entity');
                const inventoryItems = toSave.map(
                    (item) =>
                        new Inventory({
                            cardId: item.cardId,
                            userId: item.userId,
                            isFoil: item.isFoil,
                            quantity: item.quantity,
                        })
                );
                const saved = await this.inventoryRepository.save(inventoryItems);
                exactSaved = saved.length;
            }

            let ensureResult = { saved: 0, skipped: 0 };
            if (toEnsure.length > 0) {
                ensureResult = await this.inventoryRepository.ensureAtLeastOne(toEnsure);
            }

            return { deleted: toDelete.length, exactSaved, ensureResult };
        });

        const totalSaved = exactSaved + ensureResult.saved;
        this.LOGGER.debug(
            `importCards complete: saved=${totalSaved}, deleted=${deleted}, skipped=${ensureResult.skipped}, errors=${errors.length}.`
        );

        return {
            saved: totalSaved,
            deleted,
            skipped: ensureResult.skipped,
            errors,
        };
    }

    async importSet(row: SetImportRow, userId: number): Promise<ImportResult> {
        this.LOGGER.debug(`importSet for user ${userId}.`);

        let set: Set | null = null;

        if (row.set_code) {
            set = await this.setRepository.findByCode(row.set_code.toLowerCase());
        } else if (row.set_name) {
            set = await this.setRepository.findByExactName(row.set_name);
        }

        if (!set) {
            return {
                saved: 0,
                skipped: 0,
                deleted: 0,
                errors: [
                    {
                        row: 1,
                        set_code: row.set_code,
                        error: `Set not found: ${row.set_code ?? row.set_name}`,
                    },
                ],
            };
        }

        const includeVariants = parseBool(row.include_variants, false);
        const foilOverride = parseBool(row.foil, false);

        const baseOptions = new SafeQueryOptions({ limit: '10000' });
        const mainOptions = baseOptions.withBaseOnly(true);
        const allOptions = baseOptions.withBaseOnly(false);

        let cards = await this.cardRepository.findBySet(
            set.code,
            includeVariants ? allOptions : mainOptions
        );

        // Fallback: if no base cards found (all-non-main sets), retry with all
        if (cards.length === 0 && !includeVariants) {
            cards = await this.cardRepository.findBySet(set.code, allOptions);
        }

        const items = cards.map((card) => {
            const isFoil = foilOverride
                ? true
                : card.hasNonFoil
                  ? false
                  : card.hasFoil
                    ? true
                    : false;
            return { cardId: card.id, userId, isFoil };
        });

        if (items.length === 0) {
            return { saved: 0, skipped: 0, deleted: 0, errors: [] };
        }

        const result = await this.inventoryRepository.ensureAtLeastOne(items);
        this.LOGGER.debug(
            `importSet ${set.code}: saved=${result.saved}, skipped=${result.skipped}.`
        );

        return { saved: result.saved, skipped: result.skipped, deleted: 0, errors: [] };
    }
}
