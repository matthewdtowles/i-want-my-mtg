import { Inject, Injectable } from '@nestjs/common';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { ImportError, ImportResult } from 'src/core/import/import.types';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Set } from 'src/core/set/set.entity';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { InventoryRepositoryPort } from '../ports/inventory.repository.port';
import { CardImportRow, SetImportRow } from './inventory-import.types';

const MAX_ROWS = 2000;

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
        private readonly cardResolver: CardImportResolver
    ) {}

    async importCards(rows: CardImportRow[], userId: number): Promise<ImportResult> {
        this.LOGGER.debug(`importCards: ${rows.length} rows for user ${userId}.`);

        const errors: ImportError[] = [];
        const toEnsure: Array<{ cardId: string; userId: number; isFoil: boolean }> = [];
        const toSave: Array<{ cardId: string; userId: number; isFoil: boolean; quantity: number }> =
            [];
        const toDelete: Array<{ cardId: string; userId: number; isFoil: boolean }> = [];

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

        // Execute deletions - track successes and failures separately
        let deleted = 0;
        for (const item of toDelete) {
            try {
                await this.inventoryRepository.delete(item.userId, item.cardId, item.isFoil);
                deleted++;
            } catch (e) {
                this.LOGGER.error(`Failed to delete inventory: ${e.message}`);
                errors.push({
                    row: 0,
                    error: `Failed to delete card ${item.cardId}: ${e.message}`,
                });
            }
        }

        // Execute exact saves
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

        // Execute ensure-at-least-one
        let ensureResult = { saved: 0, skipped: 0 };
        if (toEnsure.length > 0) {
            ensureResult = await this.inventoryRepository.ensureAtLeastOne(toEnsure);
        }

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

        const includeVariants = this.parseBool(row.include_variants, false);
        const foilOverride = this.parseBool(row.foil, false);

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

    private parseBool(value: string | undefined, defaultValue: boolean): boolean {
        if (value === undefined || value === '') return defaultValue;
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes';
    }
}
