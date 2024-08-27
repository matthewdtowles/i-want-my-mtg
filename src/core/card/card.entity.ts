import { Set } from 'src/core/set/set.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Card {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    imgSrc: string;

    @Column({ default: false })
    isReserved?: boolean;
 
    @Column({ nullable: true })
    manaCost?: string;

    @Column()
    name: string;

    @Column()
    number: string;

    @Column({ nullable: true })
    originalText?: string;

    @Column()
    rarity: string;
    
    @ManyToOne(() => Set, set => set.cards)
    set: Set;

    @Column()
    url: string;

    @Column()
    uuid: string;
}
