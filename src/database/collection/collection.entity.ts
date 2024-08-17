import { Entity, Index, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { CardEntity } from '../card/card.entity';

@Entity()
export class CollectionEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => UserEntity, userEntity => userEntity.collection, { nullable: false })
    @Index()
    owner: UserEntity;

    @ManyToMany(() => CardEntity, { cascade: true })
    @JoinTable()
    cards: CardEntity[];
}
