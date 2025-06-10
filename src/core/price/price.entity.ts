export class Price {
    readonly id: number;
    readonly cardId: string;
    readonly foil: number | null;
    readonly normal: number | null;
    readonly date: Date;

    constructor(init: Partial<Price>) {
        this.validateInit(init);
        this.id = init.id;
        this.cardId = init.cardId;
        this.foil = init.foil ?? null;
        this.normal = init.normal ?? null;
        this.date = init.date ?? new Date();
    }

    private validateInit(init: Partial<Price>) {
        const requiredFields: string[] = ["cardId"];
        for (const field of requiredFields) {
            if (!init[field]) throw new Error(`Invalid Price initialization: ${field} is required.`);
        }
    }
}
