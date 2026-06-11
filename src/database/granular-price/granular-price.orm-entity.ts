import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Current granular price store (Phase 6.2): the current per-vendor offer, one
 * row per card / provider / retail|buylist / finish / condition (no date in the
 * key). scry upserts it and derives the existing averaged `price` from the same
 * ingest pass. 6.3 reads this directly for per-vendor buylist display. The dated
 * history lives in `granular_price_history` (scry-owned; not mapped here).
 *
 * Composite natural-key PK (no surrogate id): rows are never referenced by FK,
 * and the natural key is exactly the upsert target scry needs. `card_id` is a
 * first-class key column, so the card FK is enforced in SQL rather than mapped
 * as a relation here. `date` is the as-of date of the current offer, not part of
 * the key.
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

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'decimal' })
    price: number;

    @Column({ type: 'int', nullable: true })
    qty?: number;
}
