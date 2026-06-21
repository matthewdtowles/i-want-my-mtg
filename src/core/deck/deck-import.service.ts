import { Inject, Injectable } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { CardImportResolver } from 'src/core/import/card-import-resolver';
import { MAX_IMPORT_ROWS } from 'src/core/import/import.constants';
import { ImportError } from 'src/core/import/import.types';
import { parseDecklistText } from 'src/core/import/parsers/decklist-text.parser';
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
        @Inject(CardImportResolver) private readonly cardResolver: CardImportResolver
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
        const entries = new Map<string, { cardId: string; isSideboard: boolean; quantity: number }>();
        for (const row of cappedRows) {
            const { card, error } = await this.resolveRow(row);
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

        const deck = await this.deckService.createDeck(userId, name, format);
        const entryList = [...entries.values()];
        await this.deckService.addCards(deck.id!, userId, entryList);

        const saved = entryList.reduce((sum, e) => sum + e.quantity, 0);
        this.LOGGER.debug(
            `imported deck ${deck.id} for user ${userId}: ${saved} cards, ${errors.length} errors.`
        );
        return { deckId: deck.id!, name: deck.name, saved, errors };
    }

    private async resolveRow(row: { name: string; setCode?: string; number?: string }) {
        if (row.setCode) {
            const byPrinting = row.number
                ? await this.cardResolver.resolveCard({ set_code: row.setCode, number: row.number })
                : await this.cardResolver.resolveCard({ name: row.name, set_code: row.setCode });
            if (byPrinting.card) {
                return byPrinting;
            }
            // Unknown/odd set code: fall back to name-level so the line still resolves.
            return this.cardResolver.resolveByName(row.name);
        }
        return this.cardResolver.resolveByName(row.name);
    }
}
