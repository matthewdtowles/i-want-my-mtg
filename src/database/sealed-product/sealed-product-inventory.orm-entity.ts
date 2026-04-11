import { UserOrmEntity } from 'src/database/user/user.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SealedProductOrmEntity } from './sealed-product.orm-entity';

@Entity('sealed_product_inventory')
export class SealedProductInventoryOrmEntity {
    @PrimaryColumn({ name: 'sealed_product_uuid' })
    sealedProductUuid: string;

    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ManyToOne(() => SealedProductOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sealed_product_uuid', referencedColumnName: 'uuid' })
    sealedProduct: SealedProductOrmEntity;

    @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    user: UserOrmEntity;
}
