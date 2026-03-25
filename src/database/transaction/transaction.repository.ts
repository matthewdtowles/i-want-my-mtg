import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { Transaction } from 'src/core/transaction/transaction.entity';
import {
    CashFlowPeriod,
    TransactionRepositoryPort,
} from 'src/core/transaction/ports/transaction.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { QueryBuilderHelper } from '../query/query-builder.helper';
import { TransactionMapper } from './transaction.mapper';
import { TransactionOrmEntity } from './transaction.orm-entity';

@Injectable()
export class TransactionRepository implements TransactionRepositoryPort {
    private readonly LOGGER = getLogger(TransactionRepository.name);
    private readonly queryHelper = new QueryBuilderHelper<TransactionOrmEntity>({
        table: 'transaction',
        filterColumn: 'transaction_card.name',
        defaultSort: SortOptions.TX_DATE,
        defaultSortDesc: true,
    });

    constructor(
        @InjectRepository(TransactionOrmEntity)
        private readonly repository: Repository<TransactionOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async save(transaction: Transaction): Promise<Transaction> {
        this.LOGGER.debug(
            `Saving transaction for user ${transaction.userId}, card ${transaction.cardId}.`
        );
        const orm = TransactionMapper.toOrmEntity(transaction);
        const saved = await this.repository.save(orm);
        this.LOGGER.debug(`Saved transaction id ${saved.id}.`);
        return TransactionMapper.toCore(saved);
    }

    async findById(id: number): Promise<Transaction | null> {
        this.LOGGER.debug(`Finding transaction by id ${id}.`);
        const orm = await this.repository.findOne({ where: { id } });
        return orm ? TransactionMapper.toCore(orm) : null;
    }

    async findByUserAndCard(
        userId: number,
        cardId: string,
        isFoil?: boolean
    ): Promise<Transaction[]> {
        this.LOGGER.debug(
            `Finding transactions for user ${userId}, card ${cardId}, foil ${isFoil}.`
        );
        const where: Record<string, unknown> = { userId, cardId };
        if (isFoil !== undefined) {
            where.isFoil = isFoil;
        }
        const results = await this.repository.find({
            where,
            order: { date: 'ASC', id: 'ASC' },
        });
        return results.map(TransactionMapper.toCore);
    }

    async findBuyLots(userId: number, cardId: string, isFoil: boolean): Promise<Transaction[]> {
        this.LOGGER.debug(`Finding BUY lots for user ${userId}, card ${cardId}, foil ${isFoil}.`);
        const results = await this.repository.find({
            where: { userId, cardId, isFoil, type: 'BUY' },
            order: { date: 'ASC', id: 'ASC' },
        });
        return results.map(TransactionMapper.toCore);
    }

    async findSells(userId: number, cardId: string, isFoil: boolean): Promise<Transaction[]> {
        this.LOGGER.debug(
            `Finding SELL transactions for user ${userId}, card ${cardId}, foil ${isFoil}.`
        );
        const results = await this.repository.find({
            where: { userId, cardId, isFoil, type: 'SELL' },
            order: { date: 'ASC', id: 'ASC' },
        });
        return results.map(TransactionMapper.toCore);
    }

    async findByUser(userId: number): Promise<Transaction[]> {
        this.LOGGER.debug(`Finding all transactions for user ${userId}.`);
        const results = await this.repository.find({
            where: { userId },
            order: { date: 'DESC', id: 'DESC' },
        });
        return results.map(TransactionMapper.toCore);
    }

    async update(id: number, userId: number, fields: Partial<Transaction>): Promise<Transaction> {
        this.LOGGER.debug(`Updating transaction ${id} for user ${userId}.`);
        const existing = await this.repository.findOne({ where: { id, userId } });
        if (!existing) {
            throw new Error('Transaction not found.');
        }

        if (fields.quantity !== undefined) existing.quantity = fields.quantity;
        if (fields.pricePerUnit !== undefined) existing.pricePerUnit = fields.pricePerUnit;
        if (fields.date !== undefined) existing.date = fields.date;
        if (fields.source !== undefined) existing.source = fields.source;
        if (fields.fees !== undefined) existing.fees = fields.fees;
        if (fields.notes !== undefined) existing.notes = fields.notes;

        const saved = await this.repository.save(existing);
        this.LOGGER.debug(`Updated transaction ${id}.`);
        return TransactionMapper.toCore(saved);
    }

    async delete(id: number, userId: number): Promise<void> {
        this.LOGGER.debug(`Deleting transaction ${id} for user ${userId}.`);
        await this.repository.delete({ id, userId });
        this.LOGGER.debug(`Deleted transaction ${id}.`);
    }

    async findByUserPaginated(userId: number, options: SafeQueryOptions): Promise<Transaction[]> {
        this.LOGGER.debug(`Finding paginated transactions for user ${userId}.`);
        const qb = this.repository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.card', 'transaction_card')
            .where('transaction.userId = :userId', { userId });
        this.queryHelper.applyOptions(qb, options);
        const results = await qb.getMany();
        return results.map((orm) => {
            const core = TransactionMapper.toCore(orm);
            if (orm.card) {
                (core as any).cardName = orm.card.name;
                (core as any).cardSetCode = orm.card.setCode;
                (core as any).cardNumber = orm.card.number;
                (core as any).cardImgSrc = orm.card.imgSrc;
            }
            return core;
        });
    }

    async countByUser(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting transactions for user ${userId}.`);
        const qb = this.repository
            .createQueryBuilder('transaction')
            .leftJoin('transaction.card', 'transaction_card')
            .where('transaction.userId = :userId', { userId });
        this.queryHelper.applyFilters(qb, options.filter);
        return qb.getCount();
    }

    async getCashFlow(userId: number): Promise<CashFlowPeriod[]> {
        this.LOGGER.debug(`Getting cash flow for user ${userId}.`);
        const results = await this.repository.query(
            `
            SELECT
                TO_CHAR(date, 'YYYY-MM') AS period,
                COALESCE(SUM(CASE WHEN type = 'BUY' THEN quantity * price_per_unit ELSE 0 END), 0)::numeric AS "totalBought",
                COALESCE(SUM(CASE WHEN type = 'SELL' THEN quantity * price_per_unit ELSE 0 END), 0)::numeric AS "totalSold",
                COALESCE(SUM(CASE WHEN type = 'SELL' THEN quantity * price_per_unit ELSE -(quantity * price_per_unit) END), 0)::numeric AS "net"
            FROM "transaction"
            WHERE user_id = $1
            GROUP BY TO_CHAR(date, 'YYYY-MM')
            ORDER BY period ASC
            `,
            [userId]
        );

        return results.map((row: any) => ({
            period: row.period,
            totalBought: Number(row.totalBought),
            totalSold: Number(row.totalSold),
            net: Number(row.net),
        }));
    }
}
