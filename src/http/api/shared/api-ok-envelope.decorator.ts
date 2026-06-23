import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { BlockPaginationMeta, PaginationMeta } from 'src/http/base/api-response.dto';

/**
 * Documents a response whose body is the standard API envelope
 * (`{ success, data, error, message, meta }`) with `data` set to `model`
 * (or an array of `model` when `isArray`).
 *
 * The controllers already return `ApiResponseDto<Dto>`; this exposes that shape
 * in the OpenAPI spec so generated clients (mobile, MCP) and RapidAPI get typed
 * responses instead of an untyped body. The envelope is inlined (rather than an
 * allOf against `ApiResponseDto`) so `data` carries the model type cleanly.
 *
 * `meta` mirrors `ApiResponseDto.meta`: either `PaginationMeta` or
 * `BlockPaginationMeta` (the block-grouped set listing returns the latter,
 * which carries `multiSetBlockKeys`).
 *
 * Set `nullableData` for endpoints that return `success: true` with `data: null`
 * (e.g. portfolio summary before it's computed).
 */
export function ApiOkEnvelope<TModel extends Type<unknown>>(
    model: TModel,
    options?: {
        isArray?: boolean;
        description?: string;
        status?: number;
        nullableData?: boolean;
    },
) {
    const modelRef = options?.nullableData
        ? { allOf: [{ $ref: getSchemaPath(model) }], nullable: true }
        : { $ref: getSchemaPath(model) };
    const dataSchema = options?.isArray
        ? { type: 'array' as const, items: { $ref: getSchemaPath(model) } }
        : modelRef;

    return applyDecorators(
        ApiExtraModels(PaginationMeta, BlockPaginationMeta, model),
        ApiResponse({
            status: options?.status ?? 200,
            description: options?.description,
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: dataSchema,
                    error: { type: 'string' },
                    message: { type: 'string' },
                    meta: {
                        oneOf: [
                            { $ref: getSchemaPath(PaginationMeta) },
                            { $ref: getSchemaPath(BlockPaginationMeta) },
                        ],
                    },
                },
                required: ['success'],
            },
        }),
    );
}
