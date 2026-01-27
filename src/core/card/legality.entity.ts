import { validateInit } from 'src/core/validation.util';
import { Format } from './format.enum';
import { LegalityStatus } from './legality.status.enum';

export class Legality {
    readonly cardId: string;
    readonly format: Format;
    readonly status: LegalityStatus;

    constructor(init: Partial<Legality>) {
        validateInit(init, ['cardId', 'format', 'status']);
        this.cardId = init.cardId;
        this.format = init.format;
        this.status = init.status;
    }
}
