import { ListView } from 'src/http/hbs/list/list.view';
import { SetBlockGroup } from './set-block-group.dto';
import { SetMetaResponseDto } from './set-meta.response.dto';

/**
 * Where each layout button points. Only followed when the click is not
 * intercepted - a middle-click, an open-in-new-tab, or JS off - so both hrefs
 * carry the current filter, sort and paging rather than resetting the list.
 */
export interface SetViewToggleView {
    readonly gridUrl: string;
    readonly tableUrl: string;
}

export class SetListViewDto extends ListView {
    readonly setList: SetMetaResponseDto[];
    readonly blockGroups: SetBlockGroup[];

    /**
     * Art tiles ('grid', the default) or the sortable table ('table'). Rendered
     * server-side so the choice survives a hard load and works without JS;
     * setListAjax.js keeps it in sync from `?view=` afterwards.
     */
    readonly view: 'grid' | 'table';
    readonly isTableView: boolean;

    /**
     * Whether to offer the layout toggle. False on the home page, whose set list
     * is a shop window rather than a browsing tool - and whose toggle would have
     * to navigate to /sets to do anything, since home loads no list JS.
     */
    readonly showViewToggle: boolean;

    readonly viewToggle: SetViewToggleView;

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
        this.blockGroups = init.blockGroups || [];
        this.view = init.view === 'table' ? 'table' : 'grid';
        this.isTableView = this.view === 'table';
        this.showViewToggle = init.showViewToggle ?? true;
        this.viewToggle = init.viewToggle ?? { gridUrl: '/sets', tableUrl: '/sets?view=table' };
    }
}
