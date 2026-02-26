import { Breadcrumb } from './breadcrumb';
import { Toast } from './toast';

export class BaseViewDto {
    readonly authenticated: boolean = false;
    readonly breadcrumbs: Breadcrumb[] = [];
    indexable: boolean = false;
    readonly toast?: Toast;

    constructor(init: Partial<BaseViewDto>) {
        this.authenticated = init.authenticated || false;
        this.breadcrumbs = init.breadcrumbs || [];
        this.indexable = init.indexable || false;
        this.toast = init.toast;
    }
}
