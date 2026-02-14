import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardService } from 'src/core/card/card.service';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { isAuthenticated, toStringRecord } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { InventoryPresenter } from 'src/http/inventory/inventory.presenter';
import { FilterView } from 'src/http/list/filter.view';
import { PaginationView } from 'src/http/list/pagination.view';
import { SortableHeaderView } from 'src/http/list/sortable-header.view';
import { TableHeaderView } from 'src/http/list/table-header.view';
import { TableHeadersRowView } from 'src/http/list/table-headers-row.view';
import { getLogger } from 'src/logger/global-app-logger';
import { CardPresenter } from './card.presenter';
import { CardViewDto } from './dto/card.view.dto';
import { SingleCardResponseDto } from './dto/single-card.response.dto';

@Injectable()
export class CardOrchestrator {
    private readonly LOGGER = getLogger(CardOrchestrator.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
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
            const baseUrl = `/card/${singleCard.setCode}/${singleCard.number}`;

            return new CardViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Sets', url: '/sets' },
                    { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
                    { label: singleCard.name, url: baseUrl },
                ],
                card: singleCard,
                otherPrintings: allPrintings
                    .filter((card) => card.setCode !== setCode || card.number !== setNumber)
                    .map((card) => CardPresenter.toCardResponse(card, null, CardImgType.SMALL)),
                pagination: new PaginationView(options, baseUrl, totalPrintings),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new SortableHeaderView(options, SortOptions.CARD_SET, ['pl-2']),
                    new TableHeaderView('Card'),
                    new SortableHeaderView(options, SortOptions.PRICE),
                    new SortableHeaderView(options, SortOptions.PRICE_FOIL, ['pr-2']),
                ]),
            });
        } catch (error) {
            this.LOGGER.debug(`Error finding set card ${setCode}/${setNumber}: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'findSetCard');
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
