import { ListView } from 'src/http/hbs/list/list.view';
import { SetResponseDto } from './set.response.dto';

export class SetViewDto extends ListView {
    readonly set: SetResponseDto;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
    }
}
