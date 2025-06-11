import { Format, LegalityStatus } from "src/core/card";
import { validateInit } from "src/shared/utils";

export class Legality {
    readonly cardId: string;
    readonly format: Format;
    readonly status: LegalityStatus;

    constructor(init: Partial<Legality>) {
        validateInit(init, ["cardId", "format", "status"]);
        this.cardId = init.cardId;
        this.format = init.format;
        this.status = init.status;
    }
}