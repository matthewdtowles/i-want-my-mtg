import { SetOrmEntity } from 'src/database/set/set.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';
import { SealedProductPriceOrmEntity } from './sealed-product-price.orm-entity';

@Entity('sealed_product')
export class SealedProductOrmEntity {
    @PrimaryColumn()
    uuid: string;

    @Column()
    name: string;

    @Column({ name: 'set_code' })
    setCode: string;

    @Column({ nullable: true })
    category?: string;

    @Column({ nullable: true })
    subtype?: string;

    @Column({ name: 'card_count', nullable: true })
    cardCount?: number;

    @Column({ name: 'product_size', nullable: true })
    productSize?: number;

    @Column({ name: 'release_date', type: 'date', nullable: true })
    releaseDate?: string;

    @Column({ name: 'contents_summary', type: 'text', nullable: true })
    contentsSummary?: string;

    @Column({ name: 'purchase_url_tcgplayer', nullable: true })
    purchaseUrlTcgplayer?: string;

    @Column({ name: 'tcgplayer_product_id', nullable: true })
    tcgplayerProductId?: string;

    @ManyToOne(() => SetOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'set_code', referencedColumnName: 'code' })
    set: SetOrmEntity;

    @OneToOne(() => SealedProductPriceOrmEntity, (price) => price.sealedProduct)
    price: SealedProductPriceOrmEntity;
}
