import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from '@standard-schema/spec';
import type { JSONSchema, JSONSchemaIO, SchemaInput } from './types.js';

/**
 * Check if the input is a Standard Schema (v1)
 * Works with both StandardSchemaV1 (validation) and StandardJSONSchemaV1 (JSON Schema)
 */
export function isStandardSchema(
  schema: unknown,
): schema is StandardSchemaV1 | StandardJSONSchemaV1 {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    '~standard' in schema &&
    typeof (schema as StandardSchemaV1)['~standard'] === 'object' &&
    (schema as StandardSchemaV1)['~standard'] !== null &&
    (schema as StandardSchemaV1)['~standard'].version === 1
  );
}

/**
 * Check if Standard Schema has JSON Schema support (StandardJSONSchemaV1)
 */
export function hasJSONSchemaSupport(
  schema: StandardSchemaV1 | StandardJSONSchemaV1,
): schema is StandardJSONSchemaV1 {
  const std = schema['~standard'] as StandardJSONSchemaV1['~standard'];
  return (
    'jsonSchema' in std &&
    typeof std.jsonSchema === 'object' &&
    std.jsonSchema !== null &&
    typeof std.jsonSchema.output === 'function'
  );
}

/**
 * Check if the input looks like a raw JSON Schema
 */
export function isJSONSchema(schema: unknown): schema is JSONSchema {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }

  const obj = schema as Record<string, unknown>;

  // Check for common JSON Schema indicators
  return (
    'type' in obj ||
    'properties' in obj ||
    'items' in obj ||
    'allOf' in obj ||
    'anyOf' in obj ||
    'oneOf' in obj ||
    '$ref' in obj ||
    '$schema' in obj ||
    '$defs' in obj ||
    'definitions' in obj ||
    'enum' in obj ||
    'const' in obj
  );
}

/** JSON Schema target versions */
export type JSONSchemaTarget = 'draft-2020-12' | 'draft-07' | 'openapi-3.0';

/** Default target matching AI SDK behavior */
export const DEFAULT_JSON_SCHEMA_TARGET: JSONSchemaTarget = 'draft-07';

/**
 * Default IO mode for Standard Schema conversion.
 *
 * Uses 'output' to match `z.toJSONSchema()` default behavior, which includes
 * `additionalProperties: false` on objects. This is required for OpenAI
 * structured outputs.
 */
export const DEFAULT_JSON_SCHEMA_IO: JSONSchemaIO = 'output';

/**
 * Extract JSON Schema from various input types
 *
 * @param schema - Standard Schema, StandardJSONSchema, or raw JSON Schema
 * @param target - JSON Schema draft version (default: draft-07 to match AI SDK)
 * @param io - IO mode for Standard Schema conversion (default: 'output' to match z.toJSONSchema())
 */
export function extractJSONSchema(
  schema: SchemaInput,
  target: JSONSchemaTarget = DEFAULT_JSON_SCHEMA_TARGET,
  io: JSONSchemaIO = DEFAULT_JSON_SCHEMA_IO,
): JSONSchema {
  //  Standard Schema with JSON Schema support
  if (isStandardSchema(schema)) {
    if (hasJSONSchemaSupport(schema)) {
      // Use the specified IO mode (default: 'output' to include additionalProperties: false)
      const jsonSchemaMethod = schema['~standard'].jsonSchema?.[io];
      if (!jsonSchemaMethod) {
        throw new Error(
          `Standard Schema does not support '${io}' mode for JSON Schema conversion.`,
        );
      }
      return jsonSchemaMethod({ target }) as JSONSchema;
    }

    // Standard Schema without JSON Schema support
    throw new Error(
      `Schema library "${schema['~standard'].vendor}" does not support JSON Schema conversion. ` +
        'Please use a library that implements StandardJSONSchemaV1 or pass a raw JSON Schema.',
    );
  }

  // Raw JSON Schema
  if (isJSONSchema(schema)) {
    return schema;
  }

  // Unknown schema type
  throw new Error(
    'Invalid schema input. Expected a Standard Schema (Zod, Valibot, etc.) ' +
      'or a raw JSON Schema object.',
  );
}
