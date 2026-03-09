import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { getLogger } from 'src/logger/global-app-logger';
import { InventoryRepositoryPort } from '../ports/inventory.repository.port';

@Injectable()
export class InventoryExportService {
    private readonly LOGGER = getLogger(InventoryExportService.name);

    constructor(
        @Inject(InventoryRepositoryPort)
        private readonly inventoryRepository: InventoryRepositoryPort
    ) {}

    async exportToCsv(userId: number): Promise<string> {
        this.LOGGER.debug(`exportToCsv for user ${userId}.`);
        const items: Inventory[] = await this.inventoryRepository.findAllForExport(userId);
        this.LOGGER.debug(`Exporting ${items.length} inventory items for user ${userId}.`);

        return new Promise((resolve, reject) => {
            const rows = items.map((item) => ({
                id: item.card?.id ?? item.cardId,
                name: item.card?.name ?? '',
                set_code: item.card?.setCode ?? '',
                number: item.card?.number ?? '',
                quantity: item.quantity,
                foil: item.isFoil ? 'true' : 'false',
            }));

            stringify(
                rows,
                {
                    header: true,
                    columns: ['id', 'name', 'set_code', 'number', 'quantity', 'foil'],
                },
                (err, output) => {
                    if (err) return reject(err);
                    resolve(output);
                }
            );
        });
    }
}
