import { Card } from "src/card/entities/card.entity";
import { Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";

export class Set {

    @PrimaryGeneratedColumn()
    setId: number;

    /**
     * Number of cards in base set
     * Use to filter main set
     */
    @Column()
    baseSetSize: number;

    @Column()
    block?: string;

    @OneToMany(() => Card, (card) => card.set)
    cards: Card[];

    // @OneToMany(() => Deck, (deck) => deck.set)
    // decks?: Deck[];

    // for set image icons
    @Column()
    keyruneCode: string;

    // cardmarket set id ??
    // mcmId?: number;

    // name of set
    @Column()
    name: string;

    // parent printing set code for set variations like promotions, guild kits, etc.
    @Column()
    parentCode?: string;
    
    // release date in ISO 8601
    @Column()
    releaseDate: string;

    // @OneToMany(() => SealedProduct, (sealedProduct) => sealedProduct.set)
    // sealedProduct?: SealedProduct[];

    @Column()
    setCode: string;

    // The group identifier of the set on TCGplayer.
    @Column()
    tcgplayerGroupId?: number;

    // @OneToMany(() => CardToken, (cardToken) => cardToken.set)
    // tokens: CardToken[];

    @Column()
    tokenSetCode?: string;
    
    @Column()
    totalSetSize: number;

    // TODO: make enum or something for below?
    /**
     * "alchemy", "archenemy", "arsenal", "box", "commander", "core", "draft_innovation", 
     * "duel_deck", "expansion", "from_the_vault", "funny", "masterpiece", "masters", 
     * "memorabilia", "minigame", "planechase", "premium_deck", "promo", "spellbook", 
     * "starter", "token", "treasure_chest", "vanguard"
     */
    @Column()
    type: string;
}