import { ListView } from 'src/http/hbs/list/list.view';
import { CostBasisResponseDto } from 'src/http/hbs/transaction/dto/cost-basis.response.dto';
import { CardResponseDto } from './card.response.dto';
import { SingleCardResponseDto } from './single-card.response.dto';

export interface PriceAlertViewDto {
    id: number;
    increasePct: number | null;
    decreasePct: number | null;
    isActive: boolean;
}

export interface DeckOptionView {
    id: number;
    name: string;
    formatLabel: string;
}

export class CardViewDto extends ListView {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];
    readonly costBasis?: CostBasisResponseDto;
    readonly untrackedNormal?: number;
    readonly untrackedFoil?: number;
    readonly hasAnyNormalPrice?: boolean;
    readonly hasAnyFoilPrice?: boolean;
    readonly priceAlert?: PriceAlertViewDto;
    readonly userDecks?: DeckOptionView[];

    constructor(init: Partial<CardViewDto>) {
        super(init);
        this.card = init.card;
        this.otherPrintings = init.otherPrintings || [];
        this.costBasis = init.costBasis;
        this.untrackedNormal = init.untrackedNormal || 0;
        this.untrackedFoil = init.untrackedFoil || 0;
        this.hasAnyNormalPrice = init.hasAnyNormalPrice ?? true;
        this.hasAnyFoilPrice = init.hasAnyFoilPrice ?? true;
        this.priceAlert = init.priceAlert;
        this.userDecks = init.userDecks;
    }
}
