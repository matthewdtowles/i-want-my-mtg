import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { SealedProductOrmEntity } from './sealed-product.orm-entity';

@Entity('sealed_product_price')
export class SealedProductPriceOrmEntity {
    @PrimaryColumn({ name: 'sealed_product_uuid' })
    sealedProductUuid: string;

    @Column({ type: 'decimal', nullable: true })
    price?: number;

    @Column({ name: 'price_change_weekly', type: 'decimal', nullable: true })
    priceChangeWeekly?: number;

    @Column({ type: 'date' })
    date: string;

    @OneToOne(() => SealedProductOrmEntity, (product) => product.price)
    @JoinColumn({ name: 'sealed_product_uuid' })
    sealedProduct: SealedProductOrmEntity;
}
