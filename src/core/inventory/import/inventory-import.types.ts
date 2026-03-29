export { ImportError, ImportResult } from 'src/core/import/import.types';

export interface CardImportRow {
    id?: string;
    name?: string;
    set_code?: string;
    number?: string;
    quantity?: string;
    foil?: string;
}

export interface SetImportRow {
    set_code?: string;
    set_name?: string;
    foil?: string;
    include_variants?: string;
}
