import { BaseViewDto } from 'src/http/base/base.view.dto';

export class PortfolioViewDto extends BaseViewDto {
    readonly username: string;
    readonly hasHistory: boolean;

    constructor(init: Partial<PortfolioViewDto>) {
        super(init);
        this.username = init.username || '';
        this.hasHistory = init.hasHistory || false;
    }
}
