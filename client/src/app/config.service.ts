import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    url: string = 'https://mtgjson.com/api/v5/';
    
    constructor() {}
}