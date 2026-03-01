export class Price {
    readonly id?: number;
    readonly cardId: string;
    readonly foil: number | null;
    readonly normal: number | null;
    readonly normalChangeWeekly: number | null;
    readonly foilChangeWeekly: number | null;
    readonly date: Date;

    constructor(init: Partial<Price>) {
        this.id = init.id;
        this.cardId = init.cardId;
        this.foil = init.foil ?? null;
        this.normal = init.normal ?? null;
        this.normalChangeWeekly = init.normalChangeWeekly ?? null;
        this.foilChangeWeekly = init.foilChangeWeekly ?? null;
        this.date = init.date ?? new Date();
    }
}
