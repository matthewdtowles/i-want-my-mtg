import { Set } from "src/set/entities/set.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Card {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * TODO: code or full url?
     * URL or Code for image URL
     */
    @Column()
    image: string;

    @Column()
    isReserved?: boolean;
 
    /**
     * e.g.: '{1}{W}{W}' for one and two white
     */
    @Column()
    manaCost?: string;
    /**
     * NAME OF THE CARD
     * Multiple faced cards separated by `//`
     */
    @Column()
    name: string;
    /**
     * SET NUMBER OF THE CARD
     * Should be sorted in this order when in a collection ds
     */
    @Column()
    number: string;
    /**
     * Text of card as originally printed
     */
    @Column()
    originalText?: string;

    @Column()
    rarity: string;
    
    @ManyToOne(() => Set, (set) => set.cards)
    set: Set;

    /**
     * Universally unique identifier for every individual card ever
     */
    @Column()
    uuid: string;
}
