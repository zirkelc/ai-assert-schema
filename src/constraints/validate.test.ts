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
      expect(result.models.length).toBe(1);
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.modelId).toBe('gpt-4o');
      expect(result.models[0]?.issues.length).toBe(0);
    });

    test('returns success for JSON schema', () => {
      const result = validateSchema({
        schema: validJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(1);
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.modelId).toBe('gpt-4o');
      expect(result.models[0]?.issues.length).toBe(0);
    });
  });

  describe('invalid schemas', () => {
    test('returns failure with issues for Zod schema', () => {
      const result = validateSchema({
        schema: invalidZodSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(false);
      expect(result.models.length).toBe(1);
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.modelId).toBe('gpt-4o');
      expect(result.models[0]?.issues.some((i) => i.feature === 'oneOf')).toBe(
        true,
      );
    });

    test('returns failure with issues for JSON schema', () => {
      const result = validateSchema({
        schema: invalidJsonSchema,
        model: 'openai/gpt-4o',
      });

      expect(result.success).toBe(false);
      expect(result.models.length).toBe(1);
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.modelId).toBe('gpt-4o');
      expect(result.models[0]?.issues.some((i) => i.feature === 'oneOf')).toBe(
        true,
      );
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
      expect(
        result.models[0]?.issues.some(
          (i) => i.feature === 'additionalProperties',
        ),
      ).toBe(true);
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

  describe('multi-model validation', () => {
    test('validates against multiple models', () => {
      // Arrange
      const schema = validJsonSchema;
      const models = ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'] as const;

      // Act
      const result = validateSchema({
        schema,
        model: [...models],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.models.length).toBe(2);
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.modelId).toBe('gpt-4o');
      expect(result.models[0]?.issues.length).toBe(0);
      expect(result.models[1]?.provider).toBe('anthropic');
      expect(result.models[1]?.modelId).toBe('claude-3-5-sonnet');
      expect(result.models[1]?.issues.length).toBe(0);
    });

    test('returns failure when any model fails', () => {
      // Arrange - oneOf is unsupported by OpenAI but supported by others
      const schema = invalidJsonSchema;
      const models = ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'] as const;

      // Act
      const result = validateSchema({
        schema,
        model: [...models],
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.models.length).toBe(2);
      // OpenAI should fail (oneOf not supported)
      expect(result.models[0]?.provider).toBe('openai');
      expect(result.models[0]?.issues.length).toBeGreaterThan(0);
      // Anthropic should pass (oneOf supported)
      expect(result.models[1]?.provider).toBe('anthropic');
      expect(result.models[1]?.issues.length).toBe(0);
    });

    test('returns success when all models pass', () => {
      // Arrange
      const schema = validJsonSchema;
      const models = [
        'openai/gpt-4o',
        'anthropic/claude-3-5-sonnet',
        'google/gemini-2.0-flash',
      ] as const;

      // Act
      const result = validateSchema({
        schema,
        model: [...models],
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.models.length).toBe(3);
      expect(result.models.every((m) => m.issues.length === 0)).toBe(true);
    });
  });
});
