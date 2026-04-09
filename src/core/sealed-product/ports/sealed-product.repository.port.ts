import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductInventory } from '../sealed-product-inventory.entity';
import { SealedProduct } from '../sealed-product.entity';

export const SealedProductRepositoryPort = 'SealedProductRepositoryPort';

export interface SealedProductRepositoryPort {
    findBySetCode(setCode: string, options: SafeQueryOptions): Promise<SealedProduct[]>;

    totalBySetCode(setCode: string): Promise<number>;

    findByUuid(uuid: string): Promise<SealedProduct | null>;

    findPriceHistory(uuid: string, days?: number): Promise<{ price: number; date: string }[]>;

    findInventoryForUser(
        userId: number,
        options: SafeQueryOptions
    ): Promise<SealedProductInventory[]>;

    totalInventoryForUser(userId: number): Promise<number>;

    findInventoryItem(uuid: string, userId: number): Promise<SealedProductInventory | null>;

    saveInventory(item: SealedProductInventory): Promise<SealedProductInventory>;

    deleteInventory(uuid: string, userId: number): Promise<boolean>;
}
