import { BaseViewDto } from 'src/http/base/base.view.dto';

export class ImportExportGuideViewDto extends BaseViewDto {
    readonly title: string;

    constructor(init: Partial<ImportExportGuideViewDto>) {
        super(init);
        this.title = init.title || '';
    }
}
