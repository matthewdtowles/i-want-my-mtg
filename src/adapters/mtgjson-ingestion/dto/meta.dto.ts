import { Injectable } from "@nestjs/common";

@Injectable()
export class Meta {
    date: string;
    version: string;
};