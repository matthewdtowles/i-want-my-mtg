import { Inject, Injectable } from '@nestjs/common';
import {
    FREE_TIER_HISTORY_DAYS,
    freeTierHistoryCutoff,
} from 'src/core/billing/subscription-limits';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { CardService } from 'src/core/card/card.service';
import { buildImportErrorCsv } from 'src/core/import/import-error-csv';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { TransactionExportService } from 'src/core/transaction/export/transaction-export.service';
import { TransactionImportService } from 'src/core/transaction/import/transaction-import.service';
import { TransactionImportRow } from 'src/core/transaction/import/transaction-import.types';
import { CostBasisSummary, TransactionService } from 'src/core/transaction/transaction.service';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { FilterView } from 'src/http/hbs/list/filter.view';
import { PaginationView } from 'src/http/hbs/list/pagination.view';
import { transactionSortHeader } from 'src/http/hbs/list/sortable-header.view';
import { TableHeaderView } from 'src/http/hbs/list/table-header.view';
import { TableHeadersRowView } from 'src/http/hbs/list/table-headers-row.view';
import { ImportResultDto } from 'src/http/hbs/import/import-result.dto';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { CostBasisResponseDto } from './dto/cost-basis.response.dto';
import { TransactionRequestDto } from './dto/transaction.request.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import { TransactionUpdateRequestDto } from './dto/transaction.update-request.dto';
import { TransactionViewDto } from './dto/transaction.view.dto';
import { TransactionPresenter } from './transaction.presenter';

@Injectable()
export class TransactionOrchestrator {
    private readonly LOGGER = getLogger(TransactionOrchestrator.name);

    constructor(
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(TransactionImportService) private readonly importService: TransactionImportService,
        @Inject(TransactionExportService) private readonly exportService: TransactionExportService,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async findByUser(
        req: AuthenticatedRequest,
        options: SafeQueryOptions
    ): Promise<TransactionViewDto> {
        this.LOGGER.debug(`Find transactions for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);
            const sinceDate = subscribed ? undefined : freeTierHistoryCutoff();
            const [transactions, totalCount, unfilteredCount] = await Promise.all([
                this.transactionService.findByUserPaginated(req.user.id, options, sinceDate),
                this.transactionService.countByUser(req.user.id, options, sinceDate),
                this.transactionService.countByUser(req.user.id, new SafeQueryOptions()),
            ]);

            const responseItems: TransactionResponseDto[] = transactions.map((t) => {
                const tx = t as any;
                return TransactionPresenter.toResponseDto(
                    t,
                    tx.cardName,
                    tx.cardSetCode,
                    tx.cardNumber,
                    tx.cardImgSrc
                );
            });

            const baseUrl = '/transactions';

            return new TransactionViewDto({
                authenticated: req.isAuthenticated(),
                subscribed,
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Transactions', url: baseUrl },
                ],
                transactions: responseItems,
                username: req.user.name,
                totalTransactions: totalCount,
                hasTransactions: unfilteredCount > 0,
                freeHistoryCutoff: subscribed ? null : FREE_TIER_HISTORY_DAYS,
                filter: new FilterView(options, baseUrl, 'Filter by card name...'),
                pagination: new PaginationView(options, baseUrl, totalCount),
                tableHeadersRow: new TableHeadersRowView([
                    transactionSortHeader(options, SortOptions.TX_DATE),
                    transactionSortHeader(options, SortOptions.TX_TYPE),
                    transactionSortHeader(options, SortOptions.TX_CARD),
                    new TableHeaderView('Qty'),
                    transactionSortHeader(options, SortOptions.TX_PRICE),
                    new TableHeaderView('Total'),
                    new TableHeaderView('', ['tx-actions-cell']),
                ]),
            });
        } catch (error) {
            this.LOGGER.debug(
                `Error finding transactions for user ${req.user?.id}: ${error?.message}`
            );
            return HttpErrorHandler.toHttpException(error, 'findByUser');
        }
    }

    async create(
        dto: TransactionRequestDto,
        req: AuthenticatedRequest
    ): Promise<ApiResponseDto<Record<string, unknown>>> {
        this.LOGGER.debug(`Create transaction for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const entity = TransactionPresenter.toEntity(dto, req.user.id);
            const saved = await this.transactionService.create(entity, {
                skipInventorySync: dto.skipInventorySync,
            });
            return ApiResponseDto.ok({ id: saved.id, type: saved.type, quantity: saved.quantity });
        } catch (error) {
            this.LOGGER.debug(`Error creating transaction: ${error?.message}`);
            return ApiResponseDto.error(error.message);
        }
    }

    async update(
        id: number,
        dto: TransactionUpdateRequestDto,
        req: AuthenticatedRequest
    ): Promise<ApiResponseDto<Record<string, unknown>>> {
        this.LOGGER.debug(`Update transaction ${id} for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const fields: Record<string, unknown> = {};
            if (dto.quantity !== undefined) fields.quantity = dto.quantity;
            if (dto.pricePerUnit !== undefined) fields.pricePerUnit = dto.pricePerUnit;
            if (dto.date !== undefined) fields.date = new Date(dto.date);
            if (dto.source !== undefined) fields.source = dto.source;
            if (dto.fees !== undefined) fields.fees = dto.fees;
            if (dto.notes !== undefined) fields.notes = dto.notes;

            const { updated } = await this.transactionService.update(id, req.user.id, fields);
            return ApiResponseDto.ok({
                id: updated.id,
                type: updated.type,
                quantity: updated.quantity,
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating transaction ${id}: ${error?.message}`);
            return ApiResponseDto.error(error.message);
        }
    }

    async delete(id: number, req: AuthenticatedRequest): Promise<ApiResponseDto<null>> {
        this.LOGGER.debug(`Delete transaction ${id} for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.transactionService.delete(id, req.user.id);
            return ApiResponseDto.ok(null);
        } catch (error) {
            this.LOGGER.debug(`Error deleting transaction ${id}: ${error?.message}`);
            return ApiResponseDto.error(error.message);
        }
    }

    async importTransactions(
        rows: TransactionImportRow[],
        req: AuthenticatedRequest
    ): Promise<ImportResultDto> {
        this.LOGGER.debug(`importTransactions for user ${req.user?.id}: ${rows.length} rows.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const result = await this.importService.importTransactions(rows, req.user.id);
            const errorCsv =
                result.errors.length > 0
                    ? await buildImportErrorCsv(result.errors, [
                          'row',
                          'name',
                          'set_code',
                          'number',
                          'error',
                      ])
                    : undefined;
            return new ImportResultDto({ ...result, errorCsv });
        } catch (error) {
            this.LOGGER.debug(
                `Error importing transactions for user ${req.user?.id}: ${error?.message}`
            );
            return HttpErrorHandler.toHttpException(error, 'importTransactions');
        }
    }

    async getCostBasis(
        userId: number,
        cardId: string,
        isFoil: boolean,
        currentMarketPrice: number
    ): Promise<CostBasisResponseDto> {
        this.LOGGER.debug(`Get cost basis for user ${userId}, card ${cardId}, foil ${isFoil}.`);
        try {
            const summary: CostBasisSummary = await this.transactionService.getCostBasis(
                userId,
                cardId,
                isFoil,
                currentMarketPrice
            );
            return TransactionPresenter.toCostBasisResponse(summary, currentMarketPrice);
        } catch (error) {
            this.LOGGER.debug(`Error getting cost basis: ${error?.message}`);
            return new CostBasisResponseDto({ hasData: false });
        }
    }

    async getCardTransactions(userId: number, cardId: string): Promise<TransactionResponseDto[]> {
        this.LOGGER.debug(`Get transactions for user ${userId}, card ${cardId}.`);
        try {
            const transactions = await this.transactionService.findByUserAndCard(userId, cardId);
            const cardMap = await this.buildCardMap([cardId]);
            const card = cardMap.get(cardId);
            return transactions.map((t) =>
                TransactionPresenter.toResponseDto(
                    t,
                    card?.name,
                    card?.setCode,
                    card?.number,
                    card?.imgSrc
                )
            );
        } catch (error) {
            this.LOGGER.debug(`Error getting card transactions: ${error?.message}`);
            return [];
        }
    }

    async exportCsv(req: AuthenticatedRequest): Promise<string> {
        this.LOGGER.debug(`Export CSV for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const subscribed = await this.subscriptionService.isUserSubscribed(req.user.id);
            const sinceDate = subscribed ? undefined : freeTierHistoryCutoff();
            const transactions = await this.transactionService.findByUser(req.user.id, sinceDate);
            return await this.exportService.exportToCsv(transactions);
        } catch (error) {
            this.LOGGER.debug(`Error exporting CSV for user ${req.user?.id}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'exportCsv');
        }
    }

    private async buildCardMap(
        cardIds: string[]
    ): Promise<Map<string, { name: string; setCode: string; number: string; imgSrc: string }>> {
        const cardMap = new Map<
            string,
            { name: string; setCode: string; number: string; imgSrc: string }
        >();
        if (cardIds.length === 0) return cardMap;

        const cards = await this.cardService.findByIds(cardIds);
        for (const card of cards) {
            cardMap.set(card.id, {
                name: card.name,
                setCode: card.setCode,
                number: card.number,
                imgSrc: card.imgSrc,
            });
        }
        return cardMap;
    }
}
