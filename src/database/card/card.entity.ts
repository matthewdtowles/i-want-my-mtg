import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SetEntity } from '../set/set.entity';

@Entity()
export class CardEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    imgSrc: string;

    @Column()
    isReserved?: boolean;
 
    @Column()
    manaCost?: string;

    @Column()
    name: string;

    @Column()
    number: string;

    @Column()
    originalText?: string;

    @Column()
    rarity: string;
    
    @ManyToOne(() => SetEntity, (set) => set.cards)
    set: SetEntity;

    @Column()
    url: string;

    @Column()
    uuid: string;
}
