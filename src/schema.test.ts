import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import {
  extractJSONSchema,
  hasJSONSchemaSupport,
  isJSONSchema,
  isStandardSchema,
} from './schema.js';

describe('isStandardSchema', () => {
  test('detects Zod schema as Standard Schema', () => {
    const schema = z.object({ name: z.string() });
    expect(isStandardSchema(schema)).toBe(true);
  });

  test('returns false for plain objects', () => {
    expect(isStandardSchema({ type: 'object' })).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(isStandardSchema(null)).toBe(false);
    expect(isStandardSchema(undefined)).toBe(false);
  });
});

describe('hasJSONSchemaSupport', () => {
  test('returns true for Zod schema', () => {
    const schema = z.object({ name: z.string() });
    expect(isStandardSchema(schema)).toBe(true);
    if (isStandardSchema(schema)) {
      expect(hasJSONSchemaSupport(schema)).toBe(true);
    }
  });
});

describe('isJSONSchema', () => {
  test('detects JSON Schema with type', () => {
    expect(isJSONSchema({ type: 'object' })).toBe(true);
  });

  test('detects JSON Schema with properties', () => {
    expect(isJSONSchema({ properties: { name: { type: 'string' } } })).toBe(
      true,
    );
  });

  test('detects JSON Schema with $schema', () => {
    expect(
      isJSONSchema({ $schema: 'https://json-schema.org/draft/2020-12/schema' }),
    ).toBe(true);
  });

  test('returns false for empty object', () => {
    expect(isJSONSchema({})).toBe(false);
  });
});

describe('extractJSONSchema', () => {
  test('extracts JSON Schema from Zod schema', () => {
    const zodSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const jsonSchema = extractJSONSchema(zodSchema);

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties).toHaveProperty('name');
    expect(jsonSchema.properties).toHaveProperty('age');
  });

  test('passes through raw JSON Schema', () => {
    const rawSchema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
      },
    };
    const result = extractJSONSchema(rawSchema);
    expect(result).toBe(rawSchema);
  });

  test('uses draft-07 as default target', () => {
    const zodSchema = z.object({ name: z.string() });
    const jsonSchema = extractJSONSchema(zodSchema);
    expect(jsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
  });

  test('respects custom target', () => {
    const zodSchema = z.object({ name: z.string() });
    const jsonSchema = extractJSONSchema(zodSchema, 'draft-2020-12');
    expect(jsonSchema.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema',
    );
  });
});
