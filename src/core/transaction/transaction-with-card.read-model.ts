import { Transaction } from './transaction.entity';

/**
 * Read model: a {@link Transaction} plus the denormalized card display fields
 * the repository joins in for list views. It is not a domain entity - it exists
 * only to carry card presentation data alongside the ledger row so consumers
 * read typed fields instead of casting the entity to `any`. The card fields are
 * optional because write paths (create/update) return a plain Transaction
 * without them.
 */
export interface TransactionWithCard extends Transaction {
    readonly cardName?: string;
    readonly cardSetCode?: string;
    readonly cardNumber?: string;
    readonly cardImgSrc?: string;
}
