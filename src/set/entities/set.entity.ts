import { Card } from "src/card/entities/card.entity";
import { Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export class Set {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Number of cards in base set
     * Use to filter main set
     */
    @Column()
    baseSize: number;

    @Column()
    block?: string;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];

    // for set image icons
    @Column()
    keyruneCode: string;

    // name of set
    @Column()
    name: string;
 
    // release date in ISO 8601
    @Column()
    releaseDate: string;

    @Column()
    setCode: string;

    /**
     * "alchemy", "archenemy", "arsenal", "box", "commander", "core", "draft_innovation", 
     * "duel_deck", "expansion", "from_the_vault", "funny", "masterpiece", "masters", 
     * "memorabilia", "minigame", "planechase", "premium_deck", "promo", "spellbook", 
     * "starter", "token", "treasure_chest", "vanguard"
     */
    @Column()
    type: string;
}