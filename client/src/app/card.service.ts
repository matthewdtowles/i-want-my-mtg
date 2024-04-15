import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ConfigService } from "./config.service";
import { Set } from "./models/set.model";

@Injectable({
    providedIn: 'root'
})
export class CardService {

    private readonly FILE_EXT = '.json';

    constructor(private httpClient: HttpClient, private config: ConfigService) { 

    }

    getSet(set: string) {
        return this.httpClient.get<Set>(this.config.url + set + '.json');
    }
}