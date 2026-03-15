import { ListView } from 'src/http/hbs/list/list.view';
import { CostBasisResponseDto } from 'src/http/hbs/transaction/dto/cost-basis.response.dto';
import { CardResponseDto } from './card.response.dto';
import { SingleCardResponseDto } from './single-card.response.dto';

export class CardViewDto extends ListView {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];
    readonly costBasis?: CostBasisResponseDto;
    readonly untrackedNormal?: number;
    readonly untrackedFoil?: number;

    constructor(init: Partial<CardViewDto>) {
        super(init);
        this.card = init.card;
        this.otherPrintings = init.otherPrintings || [];
        this.costBasis = init.costBasis;
        this.untrackedNormal = init.untrackedNormal || 0;
        this.untrackedFoil = init.untrackedFoil || 0;
    }
}
