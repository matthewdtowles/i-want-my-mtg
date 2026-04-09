import { validateInit } from 'src/core/validation.util';
import { SealedProduct } from './sealed-product.entity';

export class SealedProductInventory {
    readonly sealedProductUuid: string;
    readonly userId: number;
    readonly quantity: number;
    readonly sealedProduct?: SealedProduct;

    constructor(init: Partial<SealedProductInventory>) {
        validateInit(init, ['sealedProductUuid', 'userId', 'quantity']);
        this.sealedProductUuid = init.sealedProductUuid;
        this.userId = init.userId;
        this.quantity = init.quantity;
        this.sealedProduct = init.sealedProduct;
    }
}
