import { CardOrmEntity } from 'src/database/card/card.orm-entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DeckOrmEntity } from './deck.orm-entity';

@Entity('deck_card')
export class DeckCardOrmEntity {
    @PrimaryColumn({ name: 'deck_id', type: 'int' })
    deckId: number;

    @PrimaryColumn({ name: 'card_id', type: 'varchar' })
    cardId: string;

    @PrimaryColumn({ name: 'is_sideboard', type: 'boolean', default: false })
    isSideboard: boolean;

    @Column({ name: 'quantity', type: 'int' })
    quantity: number;

    @ManyToOne(() => DeckOrmEntity, (deck) => deck.cards, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'deck_id', referencedColumnName: 'id' })
    deck: DeckOrmEntity;

    @ManyToOne(() => CardOrmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'card_id', referencedColumnName: 'id' })
    card: CardOrmEntity;
}
