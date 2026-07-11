export const TransactionRunnerPort = 'TransactionRunnerPort';

/**
 * Unit-of-work boundary. Runs `work` inside a single database transaction: all
 * repository writes made while `work` executes commit together or roll back
 * together. Nested `run` calls join the outer transaction rather than opening a
 * new one.
 *
 * Implementations bind the active transaction to the async context, so
 * repositories participate automatically without threading a manager through
 * every port method (see the adapter in src/database).
 */
export interface TransactionRunnerPort {
    run<T>(work: () => Promise<T>): Promise<T>;
}
