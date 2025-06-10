import { Format, LegalityStatus } from "src/core/card";

export class Legality {
    readonly cardId: string;
    readonly format: Format;
    readonly status: LegalityStatus;

    constructor(init: Partial<Legality>) {
        this.validateInit(init);
        this.cardId = init.cardId;
        // TODO: validate/convert format ??
        this.format = init.format;
        // TODO: validate/convert status??
        this.status = init.status;
    }

    private validateInit(init: Partial<Legality>) {
        const requiredFields: string[] = ["cardId", "format", "status"];
        for (const field of requiredFields) {
            if (!init[field]) throw new Error(`Invalid Legality initialization: ${field} is required.`);
        }
    }
}