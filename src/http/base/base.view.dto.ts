import { Breadcrumb } from './breadcrumb';
import { Toast } from './toast';

export class BaseViewDto {
    readonly authenticated: boolean = false;
    readonly breadcrumbs: Breadcrumb[] = [];
    indexable: boolean = false;
    title: string = 'I Want My MTG';
    metaDescription?: string;
    lcpImageUrl?: string = '/public/images/logo.webp';
    readonly toast?: Toast;

    constructor(init: Partial<BaseViewDto>) {
        this.authenticated = init.authenticated || false;
        this.breadcrumbs = init.breadcrumbs || [];
        this.indexable = init.indexable || false;
        this.title = init.title || 'I Want My MTG';
        this.metaDescription = init.metaDescription;
        this.lcpImageUrl = init.lcpImageUrl || '/public/images/logo.webp';
        this.toast = init.toast;
    }
}
