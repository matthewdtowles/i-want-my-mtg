import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { Readable } from "stream";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamObject } from "stream-json/streamers/StreamObject";
import { SetDto } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";

@Injectable()
export class MtgJsonApiClient {
    private readonly LOGGER: Logger = new Logger(MtgJsonApiClient.name);

    private readonly CARD_PROVIDER_URL: string = "https://mtgjson.com/api/v5";
    private readonly SET_LIST_PATH: string = "SetList.json";
    private readonly TODAY_PRICES_PATH: string = "AllPricesToday.json";

    /**
     * Return List of metadata for every Set from Set provider
     *
     * @returns array of SetLists from MTG JSON
     */
    async fetchSetList(): Promise<SetList[]> {
        const url: string = `${this.CARD_PROVIDER_URL}/${this.SET_LIST_PATH}`;
        this.LOGGER.log(`Calling provider API ${url}`);
        const response: AxiosResponse = await axios.get(url);
        let setList: SetList[] = [];
        if (response && response.data && Array.isArray(response.data.data)) {
            setList = response.data.data;
        } else {
            this.LOGGER.error(`Invalid response for fetchSetList: ${response}`);
        }
        return setList;
    }

    /**
     * Returns Set object for given code
     * Includes all CardSet objects in the Set
     *
     * @param setCode
     * @returns a SetDto from MTG JSON
     */
    async fetchSet(setCode: string): Promise<SetDto> {
        this.LOGGER.debug(`fetchSet with code ${setCode}`);
        const url: string = `${this.CARD_PROVIDER_URL}/${setCode.toUpperCase()}.json`;
        this.LOGGER.log(`Calling provider API ${url}`);
        const response: AxiosResponse = await axios.get(url);
        let set: SetDto = new SetDto();
        if (response && response.data) {
            set = response.data.data;
        } else {
            this.LOGGER.error(`Invalid response for fetchSet: ${response}`);
        }
        return set;
    }

    /**
     * Returns all prices for today
     *
     * @returns array of prices from MTG JSON
     */
    async fetchTodayPricesStream(): Promise<Readable> {
        const url: string = `${this.CARD_PROVIDER_URL}/${this.TODAY_PRICES_PATH}`;
        this.LOGGER.log(`Calling provider API ${url}`);
        const response: AxiosResponse = await axios.get(url, { responseType: "stream" });
        const pipeline = chain([
            response.data,
            parser(),
            pick({ filter: "data" }),
            streamObject(),
        ]);
        return pipeline;
    }

}