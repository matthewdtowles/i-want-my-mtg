export interface ImportError {
    row: number;
    error: string;
    [key: string]: unknown;
}

export interface ImportResult {
    saved: number;
    skipped: number;
    deleted: number;
    errors: ImportError[];
}
