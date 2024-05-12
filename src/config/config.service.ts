import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

@Injectable()
export class ConfigService {
    private readonly config: Record<string, string>;

    constructor() {
        const envPath = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
        this.config = dotenv.parse(fs.readFileSync(envPath));
    }

    get(key: string): string {
        return this.config[key];
    }
}
