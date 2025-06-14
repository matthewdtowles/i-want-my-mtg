import { Format } from "src/core/card/format.enum";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { validateInit } from "src/shared/utils/validation.util";

export class Legality {
    cardId: string;
    readonly format: Format;
    readonly status: LegalityStatus;

    constructor(init: Partial<Legality>) {
        validateInit(init, ["cardId", "format", "status"]);
        this.cardId = init.cardId;
        this.format = init.format;
        this.status = init.status;
    }
}