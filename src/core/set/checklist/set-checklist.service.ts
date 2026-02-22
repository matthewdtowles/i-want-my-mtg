import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { CardRepositoryPort } from 'src/core/card/card.repository.port';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/inventory.repository.port';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SetRepositoryPort } from 'src/core/set/set.repository.port';
import { getLogger } from 'src/logger/global-app-logger';

@Injectable()
export class SetChecklistService {
    private readonly LOGGER = getLogger(SetChecklistService.name);

    constructor(
        @Inject(SetRepositoryPort)
        private readonly setRepository: SetRepositoryPort,
        @Inject(CardRepositoryPort)
        private readonly cardRepository: CardRepositoryPort,
        @Inject(InventoryRepositoryPort)
        private readonly inventoryRepository: InventoryRepositoryPort
    ) {}

    async generateChecklist(setCode: string, userId: number | null): Promise<string> {
        this.LOGGER.debug(`generateChecklist for set ${setCode}, user ${userId}.`);

        const set = await this.setRepository.findByCode(setCode);
        if (!set) throw new Error(`Set not found: ${setCode}`);

        const allOptions = new SafeQueryOptions({ limit: '10000' });
        const cards = await this.cardRepository.findBySet(setCode, allOptions.withBaseOnly(false));

        const hasFoilCards = cards.some((c) => c.hasFoil);

        const inventoryMap = new Map<string, { normal: number; foil: number }>();
        if (userId) {
            const cardIds = cards.map((c) => c.id);
            const inventory: Inventory[] = await this.inventoryRepository.findByCards(
                userId,
                cardIds
            );
            for (const item of inventory) {
                const existing = inventoryMap.get(item.cardId) ?? { normal: 0, foil: 0 };
                if (item.isFoil) {
                    existing.foil = item.quantity;
                } else {
                    existing.normal = item.quantity;
                }
                inventoryMap.set(item.cardId, existing);
            }
        }

        const rows: string[][] = [];
        for (const card of cards) {
            const owned = inventoryMap.get(card.id) ?? { normal: 0, foil: 0 };
            const row: string[] = [
                card.number,
                card.name,
                userId ? String(owned.normal || '') : '',
            ];
            if (hasFoilCards) {
                row.push(userId ? String(owned.foil || '') : '');
            }
            rows.push(row);
        }

        const headers = ['number', 'name', 'normal'];
        if (hasFoilCards) headers.push('foil');

        return new Promise((resolve, reject) => {
            const headerBlock = `Set Name: ${set.name}\nSet Code: ${set.code.toUpperCase()}\n\n`;

            stringify(rows, { header: false }, (err, body) => {
                if (err) return reject(err);
                const headerRow = headers.join(',') + '\n';
                resolve(headerBlock + headerRow + body);
            });
        });
    }
}
