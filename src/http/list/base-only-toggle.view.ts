import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { buildQueryString } from "src/http/base/http.util";

export class BaseOnlyToggleView {
    readonly url: string;
    readonly text: string;

    constructor(options: SafeQueryOptions, baseUrl: string) {
        const toggledOptions = new SafeQueryOptions({
            ...options,
            baseOnly: !options.baseOnly
        });
        this.url = `${baseUrl}${buildQueryString(toggledOptions)}`;
        this.text = options.baseOnly ? "Show All" : "Main Only";
    }
}