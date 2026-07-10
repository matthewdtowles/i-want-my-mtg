import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';
import { getLogger } from 'src/logger/global-app-logger';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource, EntityManager } from 'typeorm';

const txContext = new AsyncLocalStorage<EntityManager>();

/**
 * The EntityManager of the transaction currently on the async stack, or
 * undefined when no transaction is open. Repositories call this to route their
 * writes through the active transaction (falling back to the default manager
 * outside one), which is what makes ledger + inventory mutations atomic (W2/B4).
 */
export function activeEntityManager(): EntityManager | undefined {
    return txContext.getStore();
}

@Injectable()
export class TypeOrmTransactionRunner implements TransactionRunnerPort {
    private readonly LOGGER = getLogger(TypeOrmTransactionRunner.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource
    ) {}

    async run<T>(work: () => Promise<T>): Promise<T> {
        // Already inside a transaction: join it rather than nest a new one.
        if (activeEntityManager()) {
            return work();
        }
        return this.dataSource.transaction((manager) => txContext.run(manager, work));
    }
}
