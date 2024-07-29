import { Set } from '../set/set.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Card {

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
    
    @ManyToOne(() => Set, (set) => set.cards)
    set: Set;

    @Column()
    url: string;

    @Column()
    uuid: string;
}
