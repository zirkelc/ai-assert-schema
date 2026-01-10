import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { extractJSONSchema } from '../../schema.js';
import type { JSONSchema } from '../../types.js';
import { validateSchema } from '../validate.js';

describe('OpenAI constraints', () => {
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
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
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
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });

  describe('passes anyOf within properties (union)', () => {
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

    test('passes for Zod schema (anyOf in properties is allowed)', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'openai/gpt-4o',
      });
      // anyOf within properties is allowed, only rootAnyOf is forbidden
      expect(result.success).toBe(true);
    });

    test('passes for JSON schema (anyOf in properties is allowed)', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('fails on rootAnyOf', () => {
    // No Zod equivalent for root-level anyOf
    const jsonSchema: JSONSchema = {
      anyOf: [{ type: 'string' }, { type: 'number' }],
    };

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'rootAnyOf')).toBe(true);
      }
    });
  });

  describe('fails on optional properties', () => {
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

    test('fails for Zod schema', () => {
      const result = validateSchema({
        schema: zodSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'optionalProperties'),
        ).toBe(true);
      }
    });

    test('fails for JSON schema', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.issues.some((i) => i.feature === 'optionalProperties'),
        ).toBe(true);
      }
    });
  });

  describe('additionalProperties behavior', () => {
    const zodSchema = z.object({
      name: z.string(),
    });

    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      // additionalProperties not set
    };

    describe('with io: output (default)', () => {
      test('zod schema without strict() includes additionalProperties: false', () => {
        // Default io is 'output', which matches z.toJSONSchema() behavior
        const extracted = extractJSONSchema(zodSchema);
        expect(extracted.additionalProperties).toBe(false);
      });

      test('passes for Zod schema (additionalProperties is automatically set)', () => {
        const result = validateSchema({
          schema: zodSchema,
          model: 'openai/gpt-4o',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('with io: input', () => {
      test('zod schema without strict() omits additionalProperties', () => {
        const extracted = extractJSONSchema(zodSchema, 'draft-07', 'input');
        expect(extracted.additionalProperties).toBeUndefined();
      });

      test('fails for Zod schema without strict()', () => {
        const result = validateSchema({
          schema: zodSchema,
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
    });

    test('fails for JSON schema without additionalProperties', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
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
  });

  describe('validates nested object properties', () => {
    const zodSchema = z
      .object({
        user: z
          .object({
            profile: z.union([z.string(), z.null()]),
          })
          .strict(),
      })
      .strict();

    const jsonSchemaWithOneOf: JSONSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            profile: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
            },
          },
          required: ['profile'],
          additionalProperties: false,
        },
      },
      required: ['user'],
      additionalProperties: false,
    };

    test('fails for JSON schema with nested oneOf', () => {
      const result = validateSchema({
        schema: jsonSchemaWithOneOf,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });

  describe('validates array items', () => {
    const jsonSchema: JSONSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    };

    test('fails for JSON schema with oneOf in array items', () => {
      const result = validateSchema({
        schema: jsonSchema,
        model: 'openai/gpt-4o',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.feature === 'oneOf')).toBe(true);
      }
    });
  });
});
