import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Granular price store (Phase 6.2): one row per card / provider / retail|buylist
 * / finish / condition / day, as ingested -- no averaging. scry populates it and
 * derives the existing averaged `price` from it. 6.3 reads it for per-vendor
 * buylist display.
 *
 * Composite natural-key PK (no surrogate id): rows are never referenced by FK,
 * and the natural key is exactly the upsert target scry needs. `card_id` is a
 * first-class key column, so the card FK is enforced in SQL rather than mapped
 * as a relation here.
 */
@Entity('granular_price')
export class GranularPriceOrmEntity {
    @PrimaryColumn({ name: 'card_id', type: 'varchar' })
    cardId: string;

    @PrimaryColumn({ type: 'varchar' })
    provider: string;

    @PrimaryColumn({ name: 'price_type', type: 'varchar' })
    priceType: string;

    @PrimaryColumn({ type: 'varchar' })
    finish: string;

    @PrimaryColumn({ type: 'varchar', default: 'NM' })
    condition: string;

    @PrimaryColumn({ type: 'date' })
    date: Date;

    @Column({ type: 'decimal', nullable: true })
    price: number | null;

    @Column({ type: 'int', nullable: true })
    qty: number | null;
}
