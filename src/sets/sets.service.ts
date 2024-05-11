import { Injectable } from '@nestjs/common';

@Injectable()
export class SetsService {}
/*
export class ConfigService {
    readonly FILE_EXT = '.json';

    url: string = 'https://mtgjson.com/api/v5/';
    
    constructor() {}
}
    constructor(private config: ConfigService) {
    }

    async requestSet(setCode: string): Promise<Set> {
        const response: AxiosResponse = await axios.get(this.config.url + setCode.toUpperCase() + this.config.FILE_EXT);
        // TODO: handle response.status
        return response.data.data;
    }
*/
