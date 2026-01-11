import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { extractJSONSchema } from '../../schema.js';
import type { JSONSchema } from '../../types.js';
import { validateSchema } from '../validate.js';

describe('Anthropic constraints', () => {
  describe('passes valid schema', () => {
    const zodSchema = z
      .object({
        name: z.string(),
        age: z.number(),
      })
      .strict();

    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
      additionalProperties: false,
    };

    test('zod schema matches json schema', () => {
      const extracted = extractJSONSchema(zodSchema);
      expect(extracted.type).toBe(jsonSchema.type);
      expect(extracted.properties).toEqual(jsonSchema.properties);
      expect(extracted.required).toEqual(jsonSchema.required);
      expect(extracted.additionalProperties).toBe(
        jsonSchema.additionalProperties,
      );
    });

    test('passes for Zod schema', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('passes anyOf (unlike OpenAI)', () => {
    const Dog = z
      .object({ type: z.literal('dog'), bark: z.boolean() })
      .strict();
    const Cat = z
      .object({ type: z.literal('cat'), meow: z.boolean() })
      .strict();
    const zodSchema = z
      .object({
        animal: z.union([Dog, Cat]),
      })
      .strict();

    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        animal: {
          anyOf: [
            {
              type: 'object',
              properties: {
                type: { type: 'string', const: 'dog' },
                bark: { type: 'boolean' },
              },
              required: ['type', 'bark'],
              additionalProperties: false,
            },
            {
              type: 'object',
              properties: {
                type: { type: 'string', const: 'cat' },
                meow: { type: 'boolean' },
              },
              required: ['type', 'meow'],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ['animal'],
      additionalProperties: false,
    };

    test('passes for Zod schema (anyOf is allowed)', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema (anyOf is allowed)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('passes rootAnyOf (unlike OpenAI)', () => {
    const jsonSchema: JSONSchema = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };

    test('passes for JSON schema (rootAnyOf is allowed)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('passes optional properties (unlike OpenAI)', () => {
    const zodSchema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });

    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'], // age is optional
      additionalProperties: false,
    };

    test('passes for Zod schema (optional properties allowed)', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema (optional properties allowed)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on numerical constraints', () => {
    test('fails on minimum', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0 },
        },
        required: ['age'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'minimum')).toBe(true);
      }
    });

    test('fails on maximum', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          age: { type: 'number', maximum: 100 },
        },
        required: ['age'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'maximum')).toBe(true);
      }
    });

    test('fails on multipleOf', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          count: { type: 'number', multipleOf: 5 },
        },
        required: ['count'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'multipleOf')).toBe(
          true,
        );
      }
    });
  });

  describe('fails on string constraints', () => {
    test('fails on minLength', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'minLength')).toBe(true);
      }
    });

    test('fails on maxLength', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100 },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'maxLength')).toBe(true);
      }
    });
  });

  describe('fails on array constraints', () => {
    test('fails on maxItems', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'maxItems')).toBe(true);
      }
    });

    test('fails on uniqueItems', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'uniqueItems')).toBe(
          true,
        );
      }
    });

    test('fails on contains', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            contains: { type: 'string', const: 'required' },
          },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'contains')).toBe(true);
      }
    });

    test('passes minItems with value 0', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, minItems: 0 },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });

    test('passes minItems with value 1', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });

    test('fails on minItems with value > 1', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'string' }, minItems: 2 },
        },
        required: ['items'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'minItems')).toBe(true);
        expect(
          result.issues.some((i) =>
            i.message.includes('minItems only supports values 0 and 1'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('fails on additionalProperties not false', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      // additionalProperties not set
    };

    test('fails for JSON schema without additionalProperties', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'additionalProperties'),
        ).toBe(true);
      }
    });
  });

  describe('validates nested objects', () => {
    test('fails on nested object without additionalProperties: false', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
            // nested object missing additionalProperties: false
          },
        },
        required: ['user'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'additionalProperties'),
        ).toBe(true);
      }
    });

    test('passes nested object with additionalProperties: false', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        required: ['user'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on enum with complex types', () => {
    test('fails for enum with object values', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          option: {
            enum: [{ type: 'a' }, { type: 'b' }],
          },
        },
        required: ['option'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'enum')).toBe(true);
      }
    });

    test('fails for enum with array values', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          option: {
            enum: [
              ['a', 'b'],
              ['c', 'd'],
            ],
          },
        },
        required: ['option'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'enum')).toBe(true);
      }
    });

    test('passes for enum with primitive values', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          status: { enum: ['active', 'inactive', null, 42, true] },
        },
        required: ['status'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'anthropic/claude-sonnet-4-5',
      });
      expect(result.success).toBe(true);
    });
  });
});
