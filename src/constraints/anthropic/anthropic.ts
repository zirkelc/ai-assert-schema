import type { ProviderConstraints, ValidationIssue } from '../../types.js';

/**
 * Anthropic constraints
 *
 * Based on: https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations
 *
 * Anthropic supports a subset of JSON Schema:
 * - Supported types: string, number, integer, boolean, object, array, null, enum, const
 * - Supported: anyOf, allOf (with limitations)
 * - NOT supported: recursive schemas
 * - NOT supported: numerical constraints (minimum, maximum, multipleOf, etc.)
 * - NOT supported: string constraints (minLength, maxLength)
 * - NOT supported: array constraints beyond minItems 0/1 (maxItems, uniqueItems, contains)
 * - Required: `additionalProperties: false` on all objects
 * - Enum: only primitive values (strings, numbers, booleans, null) - no complex types (objects, arrays)
 */
export const anthropicConstraints: ProviderConstraints = {
  provider: 'anthropic',
  unsupported: [
    // Recursive schemas
    { feature: 'recursive', message: 'Recursive schemas are not supported' },

    // Numerical constraints
    { feature: 'minimum', message: 'minimum constraint is not supported' },
    { feature: 'maximum', message: 'maximum constraint is not supported' },
    {
      feature: 'exclusiveMinimum',
      message: 'exclusiveMinimum is not supported',
    },
    {
      feature: 'exclusiveMaximum',
      message: 'exclusiveMaximum is not supported',
    },
    { feature: 'multipleOf', message: 'multipleOf is not supported' },

    // String constraints
    { feature: 'minLength', message: 'minLength constraint is not supported' },
    { feature: 'maxLength', message: 'maxLength constraint is not supported' },

    // Array constraints
    { feature: 'maxItems', message: 'maxItems constraint is not supported' },
    { feature: 'uniqueItems', message: 'uniqueItems is not supported' },
    { feature: 'contains', message: 'contains is not supported' },
    {
      feature: 'minItems',
      allowedValues: [0, 1],
      message: 'minItems only supports values 0 and 1',
    },

    // Object constraints
    {
      feature: 'additionalProperties',
      allowedValues: [false],
      message: 'additionalProperties must be explicitly set to false',
    },

    // Enum constraints
    {
      feature: 'enum',
      validate: (schema, path): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];
        if (schema.enum && Array.isArray(schema.enum)) {
          const hasComplexTypes = schema.enum.some(
            (val) => val !== null && typeof val === 'object',
          );
          if (hasComplexTypes) {
            issues.push({
              path: [...path],
              feature: 'enum',
              message:
                'Enum values must be strings, numbers, booleans, or null - complex types are not supported',
            });
          }
        }
        return issues;
      },
    },
  ],
};
