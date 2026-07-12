import { Inject, Injectable } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import {
    CardIdentifiers,
    CardImportResolver,
    CardResolveResult,
} from 'src/core/import/card-import-resolver';
import { MAX_IMPORT_ROWS } from 'src/core/import/import.constants';
import { ImportError } from 'src/core/import/import.types';
import { parseDecklistText } from 'src/core/import/parsers/decklist-text.parser';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';
import { getLogger } from 'src/logger/global-app-logger';
import { DeckService } from './deck.service';

export interface DeckImportResult {
    deckId: number;
    name: string;
    /** Total card quantity added across resolved lines. */
    saved: number;
    /** Lines that could not be parsed or resolved. */
    errors: ImportError[];
}

@Injectable()
export class DeckImportService {
    private readonly LOGGER = getLogger(DeckImportService.name);

    constructor(
        @Inject(DeckService) private readonly deckService: DeckService,
        @Inject(CardImportResolver) private readonly cardResolver: CardImportResolver,
        @Inject(TransactionRunnerPort) private readonly txRunner: TransactionRunnerPort
    ) {}

    /**
     * Create a deck from pasted decklist text. Each line is resolved to a card
     * (set-coded lines precisely, set-less lines by name); unresolved lines are
     * reported but don't block the import.
     */
    async importDecklist(
        userId: number,
        name: string,
        format: Format | null,
        text: string
    ): Promise<DeckImportResult> {
        const { rows, errors } = parseDecklistText(text);
        const cappedRows = rows.slice(0, MAX_IMPORT_ROWS);
        if (rows.length > MAX_IMPORT_ROWS) {
            errors.push({
                row: 0,
                error: `Decklist exceeds ${MAX_IMPORT_ROWS} lines; only the first ${MAX_IMPORT_ROWS} were imported`,
            });
        }

        // Aggregate by (cardId, board) so one INSERT never touches a conflict
        // row twice (Postgres rejects that) and duplicate lines sum cleanly.
        const entries = new Map<
            string,
            { cardId: string; isSideboard: boolean; quantity: number }
        >();
        const resolved = await this.resolveRows(cappedRows);
        for (let i = 0; i < cappedRows.length; i++) {
            const row = cappedRows[i];
            const { card, error } = resolved[i];
            if (error || !card) {
                errors.push({ row: row.line, name: row.name, error: error ?? 'Card not found' });
                continue;
            }
            const key = `${card.id}|${row.isSideboard}`;
            const existing = entries.get(key);
            if (existing) {
                existing.quantity += row.quantity;
            } else {
                entries.set(key, {
                    cardId: card.id,
                    isSideboard: row.isSideboard,
                    quantity: row.quantity,
                });
            }
        }

        // Create the deck and its cards atomically so a failure mid-import
        // can't leave an orphan empty deck (W2/B4).
        const entryList = [...entries.values()];
        const deck = await this.txRunner.run(async () => {
            const created = await this.deckService.createDeck(userId, name, format);
            await this.deckService.addCards(created.id!, userId, entryList);
            return created;
        });

        const saved = entryList.reduce((sum, e) => sum + e.quantity, 0);
        this.LOGGER.debug(
            `imported deck ${deck.id} for user ${userId}: ${saved} cards, ${errors.length} errors.`
        );
        return { deckId: deck.id!, name: deck.name, saved, errors };
    }

    /**
     * Batched form of the per-row resolution: printing-level lookups (rows with a
     * set code) go through one bulk pass, and anything that doesn't resolve there
     * — plus rows with no set code — falls back to name-level, resolving each
     * distinct name once in parallel (P1). Behaviour matches the old per-row path:
     * a set code that fails or is ambiguous still falls back to name-level.
     */
    private async resolveRows(
        rows: { name: string; setCode?: string; number?: string }[]
    ): Promise<CardResolveResult[]> {
        const results: CardResolveResult[] = new Array(rows.length);

        // Batch the printing-level lookups for rows that carry a set code.
        const printingIdx: number[] = [];
        const printingIdents: CardIdentifiers[] = [];
        rows.forEach((row, i) => {
            if (row.setCode) {
                printingIdx.push(i);
                printingIdents.push(
                    row.number
                        ? { set_code: row.setCode, number: row.number }
                        : { name: row.name, set_code: row.setCode }
                );
            }
        });
        const printingResults = await this.cardResolver.resolveCards(printingIdents);
        printingIdx.forEach((rowIndex, k) => {
            if (printingResults[k].card) results[rowIndex] = printingResults[k];
        });

        // Everything still unresolved falls back to name-level; resolve each
        // distinct name once, in parallel, then map back.
        const names = new Set<string>();
        rows.forEach((row, i) => {
            if (!results[i]) names.add(row.name);
        });
        const byName = new Map<string, CardResolveResult>();
        await Promise.all(
            [...names].map(async (name) => {
                byName.set(name, await this.cardResolver.resolveByName(name));
            })
        );
        rows.forEach((row, i) => {
            if (!results[i]) results[i] = byName.get(row.name);
        });

        return results;
    }
}
