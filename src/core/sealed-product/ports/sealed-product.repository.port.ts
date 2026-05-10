import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductInventory } from '../sealed-product-inventory.entity';
import { SealedProduct } from '../sealed-product.entity';

export const SealedProductRepositoryPort = 'SealedProductRepositoryPort';

export interface SealedProductRepositoryPort {
    findBySetCode(setCode: string, options: SafeQueryOptions): Promise<SealedProduct[]>;

    totalBySetCode(setCode: string): Promise<number>;

    findByUuid(uuid: string): Promise<SealedProduct | null>;

    findInventoryForUser(
        userId: number,
        options: SafeQueryOptions
    ): Promise<SealedProductInventory[]>;

    totalInventoryForUser(userId: number): Promise<number>;

    findInventoryItem(uuid: string, userId: number): Promise<SealedProductInventory | null>;

    findInventoryQuantitiesForUser(
        userId: number,
        uuids: string[]
    ): Promise<Map<string, number>>;

    saveInventory(item: SealedProductInventory): Promise<SealedProductInventory>;

    deleteInventory(uuid: string, userId: number): Promise<boolean>;
}
