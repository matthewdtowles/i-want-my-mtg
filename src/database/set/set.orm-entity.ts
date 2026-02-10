import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { SetPriceOrmEntity } from './set-price.orm-entity';

@Entity('set')
export class SetOrmEntity {
    @PrimaryColumn()
        code: string;

    @Column({ name: 'base_size' })
        baseSize: number;

    @Column({ nullable: true })
        block?: string;

    @OneToMany(() => CardOrmEntity, (card) => card.set)
        cards: CardOrmEntity[];

    @Column({ name: 'keyrune_code' })
        keyruneCode: string;

    @Column()
        name: string;

    @Column({ name: 'parent_code', nullable: true })
        parentCode?: string;

    @OneToOne(() => SetPriceOrmEntity, (setPrice) => setPrice.set)
        setPrice: SetPriceOrmEntity;

    @Column({ name: 'release_date', type: 'date' })
        releaseDate: string;

    @Column({ name: 'total_size' })
        totalSize: number;

    @Column()
        type: string;
}
