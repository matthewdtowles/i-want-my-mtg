import { Card } from "src/core/card";

export class Set {
    readonly code: string;
    readonly baseSize: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly releaseDate: string;
    readonly type: string;
    readonly block?: string;
    readonly cards?: Card[];
    readonly parentCode?: string;
}
