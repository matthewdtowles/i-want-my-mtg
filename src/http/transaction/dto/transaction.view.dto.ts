import { BaseViewDto } from 'src/http/base/base.view.dto';
import { TransactionResponseDto } from './transaction.response.dto';

export class TransactionViewDto extends BaseViewDto {
    readonly transactions: TransactionResponseDto[];
    readonly username: string;
    readonly totalTransactions: number;
    readonly hasTransactions: boolean;

    constructor(init: Partial<TransactionViewDto>) {
        super(init);
        this.transactions = init.transactions || [];
        this.username = init.username || '';
        this.totalTransactions = init.totalTransactions || 0;
        this.hasTransactions = init.hasTransactions || false;
    }
}
