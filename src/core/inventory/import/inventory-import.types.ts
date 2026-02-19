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

export interface ImportError {
    row: number;
    name?: string;
    set_code?: string;
    number?: string;
    quantity?: string;
    foil?: string;
    error: string;
}

export interface ImportResult {
    saved: number;
    skipped: number;
    deleted: number;
    errors: ImportError[];
}
