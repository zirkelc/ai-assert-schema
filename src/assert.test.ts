import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { assertSchema } from './assert.js';
import { SchemaAssertionError } from './errors.js';
import type { JSONSchema } from './types.js';

// Valid schemas for testing
const validZodSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const validJsonSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
  additionalProperties: false,
};

// Invalid schemas for testing (oneOf is not supported by OpenAI)
const invalidZodSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('a'), value: z.string() }),
  z.object({ type: z.literal('b'), value: z.number() }),
]);

const invalidJsonSchema: JSONSchema = {
  oneOf: [{ type: 'string' }, { type: 'number' }],
};

describe('assertSchema', () => {
  describe('valid schemas', () => {
    test('returns input Zod schema on success', () => {
      const result = assertSchema({
        schema: validZodSchema,
        model: 'openai/gpt-4o',
      });

      expect(result).toBe(validZodSchema);
    });

    test('returns input JSON schema on success', () => {
      const result = assertSchema({
        schema: validJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result).toBe(validJsonSchema);
    });
  });

  describe('invalid schemas', () => {
    test('throws SchemaAssertionError for Zod schema', () => {
      expect(() =>
        assertSchema({
          schema: invalidZodSchema,
          model: 'openai/gpt-4o',
        }),
      ).toThrow(SchemaAssertionError);
    });

    test('throws SchemaAssertionError for JSON schema', () => {
      expect(() =>
        assertSchema({
          schema: invalidJsonSchema,
          model: 'openai/gpt-4o',
        }),
      ).toThrow(SchemaAssertionError);
    });

    test('error contains provider and model info for Zod schema', () => {
      try {
        assertSchema({ schema: invalidZodSchema, model: 'openai/gpt-4o' });
        expect.fail('Should have thrown');
      } catch (error) {
        const schemaError = error as SchemaAssertionError;

        expect(schemaError).toBeInstanceOf(SchemaAssertionError);
        expect(schemaError.provider).toBe('openai');
        expect(schemaError.modelId).toBe('gpt-4o');
        expect(schemaError.message).toContain('unsupported components');
        expect(schemaError.message).toContain('oneOf');
        expect(schemaError.issues.length).toBeGreaterThan(0);
        expect(schemaError.issues[0]?.feature).toBe('oneOf');
      }
    });

    test('error contains provider and model info for JSON schema', () => {
      try {
        assertSchema({ schema: invalidJsonSchema, model: 'openai/gpt-4o' });
        expect.fail('Should have thrown');
      } catch (error) {
        const schemaError = error as SchemaAssertionError;

        expect(schemaError).toBeInstanceOf(SchemaAssertionError);
        expect(schemaError.provider).toBe('openai');
        expect(schemaError.modelId).toBe('gpt-4o');
        expect(schemaError.jsonSchema).toBe(invalidJsonSchema);
        expect(schemaError.message).toContain('unsupported components');
        expect(schemaError.message).toContain('oneOf');
        expect(schemaError.issues.length).toBeGreaterThan(0);
        expect(schemaError.issues[0]?.feature).toBe('oneOf');
      }
    });
  });

  describe('assertSchema.validate', () => {
    test('is accessible as assertSchema.validate', () => {
      expect(typeof assertSchema.validate).toBe('function');
    });

    test('returns success for valid schema', () => {
      const result = assertSchema.validate({
        schema: validZodSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-4o');
    });

    test('returns failure for invalid schema', () => {
      const result = assertSchema.validate({
        schema: invalidJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });

  describe('assertSchema.registry', () => {
    test('is accessible as assertSchema.registry', () => {
      expect(typeof assertSchema.registry).toBe('object');
      expect(typeof assertSchema.registry.register).toBe('function');
      expect(typeof assertSchema.registry.resolve).toBe('function');
      expect(typeof assertSchema.registry.getAll).toBe('function');
    });
  });
});
