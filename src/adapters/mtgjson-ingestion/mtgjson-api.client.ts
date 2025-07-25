import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { Readable } from "stream";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamObject } from "stream-json/streamers/StreamObject";
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
        if (!response) throw new Error("No response from provider");
        if (!response.data) throw new Error("No data in response from provider");
        if (!response.data.data) throw new Error("No data.data in response from provider");
        if (!Array.isArray(response.data.data)) throw new Error("Response.data.data is not an array");
        return response.data.data;
    }

    /**
     * Fetches all cards in a Set as a stream
     *
     * @param setCode 
     * @returns 
     */
    async fetchSetCardsStream(setCode: string): Promise<Readable> {
        const url: string = `${this.CARD_PROVIDER_URL}/${setCode.toUpperCase()}.json`;
        this.LOGGER.log(`Calling provider API ${url}`);
        const response: AxiosResponse = await axios.get(url, { responseType: "stream" });
        const pipeline = chain([
            response.data,
            parser(),
            pick({ filter: "data.cards" }),
            streamArray(),
            async (data) => data.value,
        ]);
        return pipeline;
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