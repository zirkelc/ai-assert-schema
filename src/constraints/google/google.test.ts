import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { extractJSONSchema } from '../../schema.js';
import type { JSONSchema } from '../../types.js';
import { validateSchema } from '../validate.js';

describe('Google constraints', () => {
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
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on oneOf (discriminatedUnion)', () => {
    const Dog = z
      .object({ type: z.literal('dog'), bark: z.boolean() })
      .strict();
    const Cat = z
      .object({ type: z.literal('cat'), meow: z.boolean() })
      .strict();
    const zodSchema = z
      .object({
        animal: z.discriminatedUnion('type', [Dog, Cat]),
      })
      .strict();

    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        animal: {
          oneOf: [
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

    test('zod schema produces oneOf', () => {
      const extracted = extractJSONSchema(zodSchema);
      expect(extracted.properties?.animal).toHaveProperty('oneOf');
    });

    test('fails for Zod schema', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });

  describe('passes anyOf (union) - unlike older Gemini versions', () => {
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

    test('zod schema produces anyOf', () => {
      const extracted = extractJSONSchema(zodSchema);
      expect(extracted.properties?.animal).toHaveProperty('anyOf');
    });

    test('passes for Zod schema (anyOf is supported in Gemini 2.0+)', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema (anyOf is supported in Gemini 2.0+)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on allOf', () => {
    const jsonSchema: JSONSchema = {
      allOf: [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        {
          type: 'object',
          properties: { age: { type: 'number' } },
          required: ['age'],
        },
      ],
    };

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'allOf')).toBe(true);
      }
    });
  });

  describe('fails on not', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        value: {
          not: { type: 'null' },
        },
      },
      required: ['value'],
      additionalProperties: false,
    };

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'not')).toBe(true);
      }
    });
  });

  describe('passes optional properties - unlike OpenAI', () => {
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

    test('zod schema with optional produces partial required array', () => {
      const extracted = extractJSONSchema(zodSchema);
      expect(extracted.required).toContain('name');
      expect(extracted.required).not.toContain('age');
    });

    test('passes for Zod schema (optional properties are allowed)', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema (optional properties are allowed)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('passes minimum/maximum - unlike Anthropic', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        score: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
      },
      required: ['score'],
      additionalProperties: false,
    };

    test('passes for JSON schema with minimum/maximum', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on exclusiveMinimum/exclusiveMaximum', () => {
    test('fails for exclusiveMinimum', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            exclusiveMinimum: 0,
          },
        },
        required: ['score'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'exclusiveMinimum'),
        ).toBe(true);
      }
    });

    test('fails for exclusiveMaximum', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          score: {
            type: 'number',
            exclusiveMaximum: 100,
          },
        },
        required: ['score'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'exclusiveMaximum'),
        ).toBe(true);
      }
    });
  });

  describe('passes minItems/maxItems - unlike Anthropic', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
        },
      },
      required: ['items'],
      additionalProperties: false,
    };

    test('passes for JSON schema with minItems/maxItems', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on pattern', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
        },
      },
      required: ['email'],
      additionalProperties: false,
    };

    test('fails for JSON schema with pattern', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'pattern')).toBe(true);
      }
    });
  });

  describe('fails on minLength/maxLength', () => {
    test('fails for minLength', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
          },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'minLength')).toBe(true);
      }
    });

    test('fails for maxLength', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            maxLength: 100,
          },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'maxLength')).toBe(true);
      }
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
        model: 'google.generative-ai/gemini-2.0-flash',
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
        model: 'google.generative-ai/gemini-2.0-flash',
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
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('model pattern matching', () => {
    test('matches google.generative-ai/* pattern', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.generative-ai/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('google');
    });

    test('matches google.vertex.chat/* pattern', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.vertex.chat/gemini-2.0-flash',
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('google');
    });

    test('matches google.vertex/* pattern', () => {
      const jsonSchema: JSONSchema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      };

      const result = validateSchema({
        schema: jsonSchema,
        model: 'google.vertex/gemini-pro',
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('google');
    });
  });
});
