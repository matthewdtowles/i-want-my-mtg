import { ListView } from 'src/http/hbs/list/list.view';
import { SetBlockGroup } from './set-block-group.dto';
import { SetMetaResponseDto } from './set-meta.response.dto';

export class SetListViewDto extends ListView {
    readonly setList: SetMetaResponseDto[];
    readonly blockGroups: SetBlockGroup[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
        this.blockGroups = init.blockGroups || [];
    }
}
