import { ConfigService } from "./configService";
import { Set } from "../models/Set";
import axios, { AxiosResponse } from 'axios';

export class SetService {

    constructor(private config: ConfigService) {
    }

    async requestSet(setCode: string): Promise<Set> {
        const response: AxiosResponse = await axios.get(this.config.url + setCode + this.config.FILE_EXT);
        // TODO: handle response.status
        return response.data.data;
    }
}