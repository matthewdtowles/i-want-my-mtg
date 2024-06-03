import { Identifiers } from "src/models/identifiers.model";
import { Set } from "src/set/entities/set.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Card {
    // TODO:
    // - Need mappers from mtgjson to my entities
    // - What do I need when I use this? 
    // - Where can I break into a separate table, if join tables
    // END TODO;
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * A list of all the colors in manaCost and colorIndicator properties. 
     * Some cards may not have values, such as cards with "Devoid" in its text.
     */
    @Column()
    colors: string[];
    /**
     * Available finishes: "etched", "foil", "nonfoil", "signed"
     */
    @Column()
    finishes: string[];

    /**
     * How to relate card to Identifiers
     * Identifier
     */
    @Column()
    identifiers: Identifiers;
    /**
     * Card is alt variation to a printing in this set
     */
    @Column()
    isAlternative?: boolean;
    // TODO: needed??? Can derive from other data?
    @Column()
    isPromo?: boolean;
     // TODO: needed??? Can derive from other data?
    @Column()
    isReserved?: boolean;
    /**
     * // TODO: needed??
     * Example: "adventure", "aftermath", "art_series", "augment", 
     *      "case", "class", "double_faced_token", "emblem", "flip", 
     *      "host", "leveler", "meld", "modal_dfc", "mutate", "normal",
     *      "planar", "prototype", "reversible_card", "saga", "scheme",
     *      "split", "token", "transform", "vanguard"
     */
    @Column()
    layout: string;
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
    /**
     * Pointers to uuids of transformed/melded faces
     * TODO: Need?
     */
    @Column()
    otherFaceIds?: string[];
    // TODO: Redundant? Does it matter if it is?
    @Column()
    // TODO: Move ->purchaseUrls: PurchaseUrls;
    @Column()
    rarity: string;
    
    @ManyToOne(() => Set, (set) => set.cards)
    @JoinColumn({ name: 'setId' })
    set: string;

    @Column()
    setId: number;

    /**
     * Rules/oracle text
     */
    @Column()
    text?: string;

    /**
     * Universally unique identifier for every individual card ever
     */
    @Column()
    uuid: string;
}
