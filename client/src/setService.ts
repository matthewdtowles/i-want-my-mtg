import { ConfigService } from "./configService";
import { Set } from "./models/Set";
import axios, { AxiosResponse } from 'axios';

export class SetService {

    constructor(private config: ConfigService) {
    }

    async requestSet<Set>(set: string): Promise<Set> {
        const response: AxiosResponse<Set> = await axios.get<Set>(this.config.url + set + this.config.FILE_EXT)
        return response.data;
    }
}