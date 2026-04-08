import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardService } from 'src/core/card/card.service';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { buildCardUrl, isAuthenticated, toStringRecord } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { InventoryPresenter } from 'src/http/hbs/inventory/inventory.presenter';
import { FilterView } from 'src/http/hbs/list/filter.view';
import { PaginationView } from 'src/http/hbs/list/pagination.view';
import { SortableHeaderView } from 'src/http/hbs/list/sortable-header.view';
import { TableHeaderView } from 'src/http/hbs/list/table-header.view';
import { TableHeadersRowView } from 'src/http/hbs/list/table-headers-row.view';
import { TransactionPresenter } from 'src/http/hbs/transaction/transaction.presenter';
import { getLogger } from 'src/logger/global-app-logger';
import { CardPresenter } from './card.presenter';
import { CardViewDto, PriceAlertViewDto } from './dto/card.view.dto';
import { PriceHistoryPointDto, PriceHistoryResponseDto } from './dto/price-history-response.dto';
import { SingleCardResponseDto } from './dto/single-card.response.dto';

@Injectable()
export class CardOrchestrator {
    private readonly LOGGER = getLogger(CardOrchestrator.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(PriceAlertService) private readonly priceAlertService: PriceAlertService,
        @Inject(TransactionService) private readonly transactionService: TransactionService
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async findSetCard(
        req: AuthenticatedRequest,
        setCode: string,
        setNumber: string
    ): Promise<CardViewDto> {
        this.LOGGER.debug(`Find set card ${setCode}/${setNumber}.`);
        try {
            const userId: number = req.user ? req.user.id : 0;
            const coreCard: Card | null = await this.cardService.findBySetCodeAndNumber(
                setCode,
                setNumber
            );
            if (!coreCard) {
                throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
            }
            const inventory: Inventory[] =
                userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];

            const singleCard: SingleCardResponseDto = CardPresenter.toSingleCardResponse(
                coreCard,
                InventoryPresenter.toQuantityMap(inventory)?.get(coreCard.id),
                CardImgType.NORMAL
            );
            const totalPrintings = await this.cardService.totalWithName(singleCard.name);

            const rawOptions = toStringRecord(req.query);
            const parsedOptions = new SafeQueryOptions(rawOptions);
            const lastPage = Math.max(1, Math.ceil(totalPrintings / parsedOptions.limit));
            const options =
                parsedOptions.page > lastPage
                    ? new SafeQueryOptions({ ...rawOptions, page: String(lastPage) })
                    : parsedOptions;

            this.LOGGER.debug(`Options: ${JSON.stringify(options)}`);
            const allPrintings: Card[] = await this.cardService.findWithName(
                singleCard.name,
                options
            );
            const baseUrl = buildCardUrl(singleCard.setCode, singleCard.number);

            // Compute cost basis and untracked quantities if user is authenticated
            let costBasis;
            let untrackedNormal = 0;
            let untrackedFoil = 0;
            if (userId > 0) {
                try {
                    const marketPrice = singleCard.normalPriceRaw || singleCard.foilPriceRaw || 0;
                    const summary = await this.transactionService.getCostBasis(
                        userId,
                        coreCard.id,
                        false,
                        marketPrice
                    );
                    costBasis = TransactionPresenter.toCostBasisResponse(summary, marketPrice);
                } catch (err) {
                    this.LOGGER.debug(`Cost basis unavailable: ${err?.message}`);
                }

                // Compute untracked inventory (inventory qty - transaction-derived qty)
                try {
                    const txQtyNormal = await this.transactionService.getRemainingQuantity(
                        userId,
                        coreCard.id,
                        false
                    );
                    const txQtyFoil = await this.transactionService.getRemainingQuantity(
                        userId,
                        coreCard.id,
                        true
                    );
                    const invNormal = singleCard.normalQuantity || 0;
                    const invFoil = singleCard.foilQuantity || 0;
                    untrackedNormal = Math.max(0, invNormal - txQtyNormal);
                    untrackedFoil = Math.max(0, invFoil - txQtyFoil);
                } catch (err) {
                    this.LOGGER.debug(`Untracked qty unavailable: ${err?.message}`);
                }
            }

            // Fetch existing price alert for this card
            let priceAlert: PriceAlertViewDto | undefined;
            if (userId > 0) {
                try {
                    const alert = await this.priceAlertService.findByUserAndCard(
                        userId,
                        coreCard.id
                    );
                    if (alert) {
                        priceAlert = {
                            id: alert.id,
                            increasePct: alert.increasePct,
                            decreasePct: alert.decreasePct,
                            isActive: alert.isActive,
                        };
                    }
                } catch (err) {
                    this.LOGGER.debug(`Price alert lookup unavailable: ${err?.message}`);
                }
            }

            const otherPrintings = allPrintings
                .filter((card) => card.setCode !== setCode || card.number !== setNumber)
                .map((card) => CardPresenter.toCardResponse(card, null, CardImgType.NORMAL));

            const hasAnyNormalPrice = otherPrintings.some((c) => c.normalPriceRaw > 0);
            const hasAnyFoilPrice = otherPrintings.some((c) => c.foilPriceRaw > 0);

            const printingHeaders = [
                new SortableHeaderView(options, SortOptions.CARD_SET, ['pl-2']),
                new TableHeaderView('Card'),
            ];
            if (hasAnyNormalPrice) {
                printingHeaders.push(new SortableHeaderView(options, SortOptions.PRICE));
            }
            if (hasAnyFoilPrice) {
                printingHeaders.push(
                    new SortableHeaderView(options, SortOptions.PRICE_FOIL, ['pr-2'])
                );
            }

            return new CardViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Sets', url: '/sets' },
                    { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
                    { label: singleCard.name, url: baseUrl },
                ],
                card: singleCard,
                costBasis,
                untrackedNormal,
                untrackedFoil,
                priceAlert,
                otherPrintings,
                hasAnyNormalPrice,
                hasAnyFoilPrice,
                pagination: new PaginationView(options, baseUrl, totalPrintings),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView(printingHeaders),
            });
        } catch (error) {
            this.LOGGER.debug(`Error finding set card ${setCode}/${setNumber}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'findSetCard');
        }
    }

    async getPriceHistory(cardId: string, days?: number): Promise<PriceHistoryResponseDto> {
        this.LOGGER.debug(`Get price history for card ${cardId}, days=${days}.`);
        try {
            const prices = await this.cardService.findPriceHistory(cardId, days);
            const points: PriceHistoryPointDto[] = prices.map(CardPresenter.toPriceHistoryPoint);
            return { cardId, prices: points };
        } catch (error) {
            this.LOGGER.debug(`Error getting price history for ${cardId}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getPriceHistory');
        }
    }

    async getPrintingsLastPage(name: string, query: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Find last page for other printings pagination for ${name}.`);
        try {
            const totalCards = await this.cardService.totalWithName(name);
            const lastPage = Math.max(1, Math.ceil(totalCards / query.limit));
            this.LOGGER.debug(`Last page for ${name}: ${lastPage}`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(`Error finding last page for ${name}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'getPrintingsLastPage');
        }
    }
}
