import { validateInit } from "src/shared/utils/validation.util";

export class Price {
    readonly id?: number;
    readonly cardId: string;
    readonly foil: number | null;
    readonly normal: number | null;
    readonly date: Date;

    constructor(init: Partial<Price>) {
        validateInit(init, ["cardId"]);
        this.id = init.id;
        this.cardId = init.cardId;
        this.foil = init.foil ?? null;
        this.normal = init.normal ?? null;
        this.date = init.date ?? new Date();
    }
}
