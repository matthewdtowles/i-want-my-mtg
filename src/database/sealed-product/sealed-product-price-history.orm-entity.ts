import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SealedProductOrmEntity } from './sealed-product.orm-entity';

@Entity('sealed_product_price_history')
export class SealedProductPriceHistoryOrmEntity {
    @PrimaryGeneratedColumn('identity')
    id: number;

    @Column({ name: 'sealed_product_uuid' })
    sealedProductUuid: string;

    @Column({ type: 'decimal', nullable: true })
    price?: number;

    @Column({ type: 'date' })
    date: string;

    @ManyToOne(() => SealedProductOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sealed_product_uuid' })
    sealedProduct: SealedProductOrmEntity;
}
