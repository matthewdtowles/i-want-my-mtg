import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { buildQueryString } from 'src/http/base/http.util';

export class BaseOnlyToggleView {
    readonly url: string;
    readonly text: string;
    readonly isBaseOnly: boolean;

    constructor(options: SafeQueryOptions, baseUrl: string) {
        this.isBaseOnly = options.baseOnly;
        const toggledOptions = new SafeQueryOptions({
            ...options,
            baseOnly: !options.baseOnly,
        });
        this.url = `${baseUrl}${buildQueryString(toggledOptions)}`;
        this.text = options.baseOnly ? 'Show All' : 'Main Only';
    }
}
