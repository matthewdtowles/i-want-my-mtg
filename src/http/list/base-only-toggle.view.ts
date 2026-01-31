import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { buildQueryString } from 'src/http/base/http.util';

export class BaseOnlyToggleView {
    readonly url: string;
    readonly text: string;
    readonly isBaseOnly: boolean;
    readonly visible: boolean;

    constructor(
        options: SafeQueryOptions,
        baseUrl: string,
        targetMaxPage: number,
        visible: boolean = true
    ) {
        this.isBaseOnly = options.baseOnly;
        this.visible = visible;

        // Adjust page if current page exceeds max for toggled state
        const adjustedPage = Math.min(options.page, targetMaxPage);

        const toggledOptions = new SafeQueryOptions({
            baseOnly: String(!options.baseOnly),
            page: String(adjustedPage),
            limit: String(options.limit),
            ...(options.ascend !== undefined && { ascend: String(options.ascend) }),
            ...(options.filter && { filter: options.filter }),
            ...(options.sort && { sort: String(options.sort) }),
        });

        this.url = `${baseUrl}${buildQueryString(toggledOptions)}`;
        this.text = options.baseOnly ? 'Show All' : 'Main Only';
    }
}
