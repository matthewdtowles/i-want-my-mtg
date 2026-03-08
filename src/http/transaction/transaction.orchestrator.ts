import { Inject, Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify';
import { CardService } from 'src/core/card/card.service';
import { CostBasisSummary, TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { CostBasisResponseDto } from './dto/cost-basis.response.dto';
import { TransactionApiResponseDto } from './dto/transaction.api-response.dto';
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
        @Inject(CardService) private readonly cardService: CardService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async findByUser(req: AuthenticatedRequest): Promise<TransactionViewDto> {
        this.LOGGER.debug(`Find transactions for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const transactions = await this.transactionService.findByUser(req.user.id);
            const cardIds = [...new Set(transactions.map((t) => t.cardId))];
            const cardMap = await this.buildCardMap(cardIds);

            const responseItems: TransactionResponseDto[] = transactions.map((t) => {
                const card = cardMap.get(t.cardId);
                return TransactionPresenter.toResponseDto(
                    t,
                    card?.name,
                    card?.setCode,
                    card?.number
                );
            });

            return new TransactionViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Transactions', url: '/transactions' },
                ],
                transactions: responseItems,
                username: req.user.name,
                totalTransactions: transactions.length,
                hasTransactions: transactions.length > 0,
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
    ): Promise<TransactionApiResponseDto> {
        this.LOGGER.debug(`Create transaction for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const entity = TransactionPresenter.toEntity(dto, req.user.id);
            const saved = await this.transactionService.create(entity, {
                skipInventorySync: dto.skipInventorySync,
            });
            return new TransactionApiResponseDto({
                success: true,
                data: { id: saved.id, type: saved.type, quantity: saved.quantity },
            });
        } catch (error) {
            this.LOGGER.debug(`Error creating transaction: ${error?.message}`);
            return new TransactionApiResponseDto({
                success: false,
                error: error.message,
            });
        }
    }

    async update(
        id: number,
        dto: TransactionUpdateRequestDto,
        req: AuthenticatedRequest
    ): Promise<TransactionApiResponseDto> {
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
            return new TransactionApiResponseDto({
                success: true,
                data: { id: updated.id, type: updated.type, quantity: updated.quantity },
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating transaction ${id}: ${error?.message}`);
            return new TransactionApiResponseDto({
                success: false,
                error: error.message,
            });
        }
    }

    async delete(id: number, req: AuthenticatedRequest): Promise<TransactionApiResponseDto> {
        this.LOGGER.debug(`Delete transaction ${id} for user ${req.user?.id}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.transactionService.delete(id, req.user.id);
            return new TransactionApiResponseDto({ success: true });
        } catch (error) {
            this.LOGGER.debug(`Error deleting transaction ${id}: ${error?.message}`);
            return new TransactionApiResponseDto({
                success: false,
                error: error.message,
            });
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
                TransactionPresenter.toResponseDto(t, card?.name, card?.setCode, card?.number)
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
            const transactions = await this.transactionService.findByUser(req.user.id);
            const cardIds = [...new Set(transactions.map((t) => t.cardId))];
            const cardMap = await this.buildCardMap(cardIds);

            const rows = transactions.map((t) => {
                const card = cardMap.get(t.cardId);
                const total = t.quantity * t.pricePerUnit;
                return {
                    Date: TransactionPresenter.formatDate(t.date),
                    Type: t.type,
                    'Card Name': TransactionPresenter.escapeCsvField(card?.name || ''),
                    Set: card?.setCode?.toUpperCase() || '',
                    'Collector #': card?.number || '',
                    Foil: t.isFoil ? 'Yes' : 'No',
                    Quantity: String(t.quantity),
                    'Price Per Unit': t.pricePerUnit.toFixed(2),
                    Total: total.toFixed(2),
                    Fees: t.fees != null ? t.fees.toFixed(2) : '',
                    Source: TransactionPresenter.escapeCsvField(t.source || ''),
                    Notes: TransactionPresenter.escapeCsvField(t.notes || ''),
                };
            });

            return new Promise((resolve, reject) => {
                stringify(
                    rows,
                    {
                        header: true,
                        columns: [
                            'Date', 'Type', 'Card Name', 'Set', 'Collector #',
                            'Foil', 'Quantity', 'Price Per Unit', 'Total',
                            'Fees', 'Source', 'Notes',
                        ],
                    },
                    (err, output) => (err ? reject(err) : resolve(output))
                );
            });
        } catch (error) {
            this.LOGGER.debug(`Error exporting CSV for user ${req.user?.id}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'exportCsv');
        }
    }

    private async buildCardMap(
        cardIds: string[]
    ): Promise<Map<string, { name: string; setCode: string; number: string }>> {
        const cardMap = new Map<string, { name: string; setCode: string; number: string }>();
        if (cardIds.length === 0) return cardMap;

        const cards = await this.cardService.findByIds(cardIds);
        for (const card of cards) {
            cardMap.set(card.id, { name: card.name, setCode: card.setCode, number: card.number });
        }
        return cardMap;
    }
}
