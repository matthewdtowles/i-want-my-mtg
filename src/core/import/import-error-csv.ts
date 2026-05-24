import { stringify } from 'csv-stringify';
import { ImportError } from './import.types';

/** Columns to emit in the downloadable error CSV. */
export type ImportErrorColumn =
    | 'row'
    | 'name'
    | 'set_code'
    | 'number'
    | 'quantity'
    | 'foil'
    | 'error';

const DEFAULT_COLUMNS: ImportErrorColumn[] = ['row', 'name', 'set_code', 'number', 'error'];

/**
 * Build a downloadable CSV of per-row import errors. `columns` controls
 * which columns appear and their order; callers pick the set that matches
 * the import flow (transactions don't surface quantity/foil, inventory
 * does).
 */
export function buildImportErrorCsv(
    errors: ImportError[],
    columns: ImportErrorColumn[] = DEFAULT_COLUMNS
): Promise<string> {
    return new Promise((resolve, reject) => {
        const rows = errors.map((e) => {
            const row: Record<string, string | number> = {};
            for (const col of columns) {
                row[col] =
                    (e as Record<string, unknown>)[col] != null
                        ? String((e as Record<string, unknown>)[col])
                        : '';
            }
            return row;
        });
        stringify(rows, { header: true, columns }, (err, out) =>
            err ? reject(err) : resolve(out)
        );
    });
}
