import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PublishedDeckCardOrmEntity } from './published-deck-card.orm-entity';

@Entity('published_deck')
export class PublishedDeckOrmEntity {
    @PrimaryGeneratedColumn('identity')
    id: number;

    @Column()
    source: string;

    @Column({ name: 'source_uri' })
    sourceUri: string;

    @Column({ name: 'tournament_name', nullable: true })
    tournamentName: string | null;

    @Column({ name: 'tournament_date', type: 'date', nullable: true })
    tournamentDate: string | null;

    @Column({ nullable: true })
    format: string | null;

    @Column({ nullable: true })
    archetype: string | null;

    @Column({ nullable: true })
    player: string | null;

    @Column({ nullable: true })
    result: string | null;

    @OneToMany(() => PublishedDeckCardOrmEntity, (c) => c.deck)
    cards: PublishedDeckCardOrmEntity[];
}
