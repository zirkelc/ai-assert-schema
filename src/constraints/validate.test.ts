import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { JSONSchema } from '../types.js';
import { validateSchema } from './validate.js';

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

describe('validateSchema', () => {
  describe('valid schemas', () => {
    test('returns success for Zod schema', () => {
      const result = validateSchema({
        schema: validZodSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-4o');
    });

    test('returns success for JSON schema', () => {
      const result = validateSchema({
        schema: validJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-4o');
    });
  });

  describe('invalid schemas', () => {
    test('returns failure with issues for Zod schema', () => {
      const result = validateSchema({
        schema: invalidZodSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-4o');
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });

    test('returns failure with issues for JSON schema', () => {
      const result = validateSchema({
        schema: invalidJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('openai');
      expect(result.modelId).toBe('gpt-4o');
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });

  describe('io option', () => {
    const zodSchemaWithoutStrict = z.object({
      name: z.string(),
    });

    const jsonSchemaWithoutAdditionalProperties: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      // additionalProperties not set
    };

    test('io: output (default) adds additionalProperties for Zod schema', () => {
      const result = validateSchema({
        schema: zodSchemaWithoutStrict,
        model: 'openai/gpt-4o',
        // io defaults to 'output'
      });

      expect(result.success).toBe(true);
    });

    test('io: input fails for Zod schema without .strict()', () => {
      const result = validateSchema({
        schema: zodSchemaWithoutStrict,
        model: 'openai/gpt-4o',
        io: 'input',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some(
            (i) => i.feature === 'additionalPropertiesNotFalse',
          ),
        ).toBe(true);
      }
    });

    test('io option does not affect JSON schema validation', () => {
      // JSON schemas are passed through as-is, io option only affects Standard Schema conversion
      const resultOutput = validateSchema({
        schema: jsonSchemaWithoutAdditionalProperties,
        model: 'openai/gpt-4o',
        io: 'output',
      });

      const resultInput = validateSchema({
        schema: jsonSchemaWithoutAdditionalProperties,
        model: 'openai/gpt-4o',
        io: 'input',
      });

      // Both should fail because the JSON schema doesn't have additionalProperties: false
      expect(resultOutput.success).toBe(false);
      expect(resultInput.success).toBe(false);
    });
  });
});
