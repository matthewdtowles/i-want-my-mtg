import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DeckOrmEntity } from './deck.orm-entity';

@Entity('deck_card')
export class DeckCardOrmEntity {
    @PrimaryColumn({ name: 'deck_id' })
    deckId: number;

    @PrimaryColumn({ name: 'card_id' })
    cardId: string;

    @PrimaryColumn({ name: 'is_sideboard', type: 'boolean' })
    isSideboard: boolean;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ManyToOne(() => DeckOrmEntity, (deck) => deck.cards, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'deck_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_deck_card_deck',
    })
    deck: DeckOrmEntity;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'card_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'fk_deck_card_card',
    })
    card: CardOrmEntity;
}
