import { ListView } from 'src/http/hbs/list/list.view';
import { SetResponseDto } from './set.response.dto';

export class SetViewDto extends ListView {
    readonly set: SetResponseDto;
    readonly hasAnyNormalPrice?: boolean;
    readonly hasAnyFoilPrice?: boolean;
    readonly hasAnyPrice?: boolean;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
        this.hasAnyNormalPrice = init.hasAnyNormalPrice ?? true;
        this.hasAnyFoilPrice = init.hasAnyFoilPrice ?? true;
        this.hasAnyPrice = this.hasAnyNormalPrice || this.hasAnyFoilPrice;
    }
}
