import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// `application/octet-stream` is a pragmatic allowance: Safari (and some Windows
// configurations) send that MIME for .csv uploads. The `.csv` extension check
// below is the load-bearing defense against renamed-binary uploads.
const CSV_MIME_TYPES = new Set([
    'text/csv',
    'text/plain',
    'application/csv',
    'application/octet-stream',
]);

export const CSV_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const csvUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: CSV_UPLOAD_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        const validExtension = file.originalname.toLowerCase().endsWith('.csv');
        const validMime = CSV_MIME_TYPES.has(file.mimetype);
        cb(null, validExtension && validMime);
    },
});
