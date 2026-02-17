import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { SearchQueryOptions } from 'src/core/query/search-query-options.dto';
import { SearchService } from 'src/core/search/search.service';
import { Set } from 'src/core/set/set.entity';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BASE_IMAGE_URL, isAuthenticated } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { PaginationView } from 'src/http/list/pagination.view';
import { SetTypeMapper } from 'src/http/set/set-type.mapper';
import { getLogger } from 'src/logger/global-app-logger';
import { SearchCardResultDto, SearchSetResultDto, SearchViewDto } from './dto/search.view.dto';

@Injectable()
export class SearchOrchestrator {
    private readonly LOGGER = getLogger(SearchOrchestrator.name);

    constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

    async search(req: AuthenticatedRequest, options: SearchQueryOptions): Promise<SearchViewDto> {
        const term = options.q;
        this.LOGGER.debug(`Search for: ${term}.`);
        try {
            if (!term) {
                return new SearchViewDto({
                    authenticated: isAuthenticated(req),
                    breadcrumbs: [
                        { label: 'Home', url: '/' },
                        { label: 'Search', url: '/search' },
                    ],
                    query: '',
                });
            }

            const result = await this.searchService.search(term, options);
            const baseUrl = '/search';

            return new SearchViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Search', url: '/search' },
                ],
                query: term,
                cards: result.cards.map((card) => this.toCardResult(card)),
                sets: result.sets.map((set) => this.toSetResult(set)),
                cardTotal: result.cardTotal,
                setTotal: result.setTotal,
                cardPagination: new PaginationView(options, baseUrl, result.cardTotal),
                setPagination: new PaginationView(options, baseUrl, result.setTotal),
            });
        } catch (error) {
            this.LOGGER.debug(`Error searching for "${term}": ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'search');
        }
    }

    private toCardResult(card: Card): SearchCardResultDto {
        return new SearchCardResultDto({
            name: card.name,
            number: card.number,
            imgSrc: `${BASE_IMAGE_URL}/${CardImgType.SMALL}/front/${card.imgSrc}`,
            setCode: card.setCode,
            keyruneCode: card.set?.keyruneCode ?? card.setCode,
            rarity: this.safeRarity(card.rarity),
            url: `/card/${card.setCode.toLowerCase()}/${card.number}`,
        });
    }

    private toSetResult(set: Set): SearchSetResultDto {
        return new SearchSetResultDto({
            code: set.code,
            name: set.name,
            keyruneCode: set.keyruneCode ?? set.code,
            releaseDate: set.releaseDate,
            url: `/sets/${set.code.toLowerCase()}`,
            tags: SetTypeMapper.mapSetTypeToTags(set),
        });
    }

    private safeRarity(rarity: string): string {
        if (Object.values(CardRarity).includes(rarity as CardRarity)) {
            return (rarity as string).toLowerCase();
        }
        return 'common';
    }
}
