import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { SellPlan } from 'src/core/pricing/sell-value.policy';
import { vendorDisplayName } from 'src/core/pricing/vendor';
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

    /**
     * Market sell value CSV (6.4): one row per sell-plan item. Prices/payouts
     * are plain decimals (no $) so the file is spreadsheet-friendly.
     */
    async sellPlanToCsv(plan: SellPlan): Promise<string> {
        this.LOGGER.debug(`sellPlanToCsv: ${plan.itemsWithOffers} items.`);
        return new Promise((resolve, reject) => {
            const rows = plan.groups.flatMap((group) =>
                group.items.map((item) => ({
                    name: item.inventory.card?.name ?? '',
                    set_code: item.inventory.card?.setCode ?? '',
                    number: item.inventory.card?.number ?? '',
                    finish: item.inventory.isFoil ? 'foil' : 'normal',
                    owned_qty: item.inventory.quantity,
                    vendor: vendorDisplayName(group.provider),
                    offer: (item.offer.price as number).toFixed(2),
                    sellable_qty: item.sellableQuantity,
                    payout: item.payout.toFixed(2),
                }))
            );

            stringify(
                rows,
                {
                    header: true,
                    columns: [
                        'name',
                        'set_code',
                        'number',
                        'finish',
                        'owned_qty',
                        'vendor',
                        'offer',
                        'sellable_qty',
                        'payout',
                    ],
                },
                (err, output) => {
                    if (err) return reject(err);
                    resolve(output);
                }
            );
        });
    }
}
