import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { CardEntity } from '../card/card.entity';

@Entity()
export class CollectionEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    owner: UserEntity;

    @OneToMany(() => CardEntity, (card) => card.set)
    cards: CardEntity[];
}
