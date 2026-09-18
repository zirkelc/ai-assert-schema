import { describe, expect, test } from 'vitest';
import type { JSONSchema } from '../../types.js';
import { validateSchema } from '../validate.js';

const model = 'azure/my-openai-deployment';

/**
 * Wraps a property schema in a root object that is otherwise valid for Azure OpenAI.
 */
function withProperty(property: JSONSchema): JSONSchema {
  return {
    type: 'object',
    properties: { value: property },
    required: ['value'],
    additionalProperties: false,
  };
}

describe('Azure OpenAI constraints', () => {
  test('passes valid schema', () => {
    // Arrange
    const jsonSchema = withProperty({ type: 'string' });

    // Act
    const result = validateSchema({ schema: jsonSchema, model });

    // Assert
    expect(result.success).toBe(true);
  });

  test('inherits OpenAI constraints', () => {
    // Arrange
    const jsonSchema = withProperty({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    });

    // Act
    const result = validateSchema({ schema: jsonSchema, model });

    // Assert
    expect(result.success).toBe(false);
    expect(result.models[0]?.issues.map((i) => i.feature)).toEqual(['oneOf']);
  });

  test.each<[string, JSONSchema]>([
    ['minLength', { type: 'string', minLength: 1 }],
    ['maxLength', { type: 'string', maxLength: 100 }],
    ['pattern', { type: 'string', pattern: '^[A-Z]+$' }],
    ['format', { type: 'string', format: 'email' }],
    ['minimum', { type: 'number', minimum: 0 }],
    ['maximum', { type: 'number', maximum: 10 }],
    ['multipleOf', { type: 'number', multipleOf: 2 }],
    [
      'propertyNames',
      {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
        propertyNames: { pattern: '^[a-z]+$' },
      },
    ],
    [
      'minProperties',
      {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
        minProperties: 1,
      },
    ],
    [
      'maxProperties',
      {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
        maxProperties: 1,
      },
    ],
    [
      'unevaluatedProperties',
      {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
        unevaluatedProperties: false,
      } as JSONSchema,
    ],
    ['minItems', { type: 'array', items: { type: 'string' }, minItems: 1 }],
    ['maxItems', { type: 'array', items: { type: 'string' }, maxItems: 5 }],
    ['uniqueItems', { type: 'array', items: { type: 'string' }, uniqueItems: true }],
    ['contains', { type: 'array', items: { type: 'string' }, contains: { type: 'string' } }],
    ['minContains', { type: 'array', items: { type: 'string' }, minContains: 1 } as JSONSchema],
    ['maxContains', { type: 'array', items: { type: 'string' }, maxContains: 1 } as JSONSchema],
    [
      'unevaluatedItems',
      {
        type: 'array',
        items: { type: 'string' },
        unevaluatedItems: false,
      } as JSONSchema,
    ],
  ])('fails on %s', (feature, property) => {
    // Arrange
    const jsonSchema = withProperty(property);

    // Act
    const result = validateSchema({ schema: jsonSchema, model });

    // Assert
    expect(result.success).toBe(false);
    expect(result.models[0]?.issues.map((i) => i.feature)).toEqual([feature]);
    expect(result.models[0]?.issues[0]?.path).toEqual(['properties', 'value']);
  });
});
