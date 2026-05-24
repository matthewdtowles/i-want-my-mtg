/**
 * Hard cap on rows processed per import file, applied by import services.
 * Parsers do not slice — they hand off every record so the service can emit
 * a single, accurate truncation error message when the cap is exceeded.
 */
export const MAX_IMPORT_ROWS = 2000;
