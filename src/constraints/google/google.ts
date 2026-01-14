import type { ProviderConstraints, ValidationIssue } from '../../types.js';

/**
 * Google constraints
 *
 * Based on: https://ai.google.dev/gemini-api/docs/structured-output#json_schema_support
 *
 * Google Gemini (2.0+) supports a subset of JSON Schema:
 * - Supported types: string, number, integer, boolean, object, array, null
 * - Supported: anyOf (Gemini 2.0+), enum, format (date-time, date, time)
 * - Supported: properties, required, additionalProperties
 * - Supported: items, prefixItems, minItems, maxItems
 * - Supported: minimum, maximum
 * - NOT supported: oneOf, allOf, not
 * - NOT supported: if/then/else conditionals
 * - NOT supported: pattern, minLength, maxLength
 * - NOT supported: recursive schemas ($ref to self)
 * - NOT supported: dependentRequired, dependentSchemas
 * - NOT supported: patternProperties, propertyNames
 * - NOT supported: uniqueItems, contains, additionalItems
 * - NOT supported: exclusiveMinimum, exclusiveMaximum, multipleOf
 * - Enum: only primitive values (strings, numbers, booleans, null)
 */
export const googleConstraints: ProviderConstraints = {
  provider: 'google',
  unsupported: [
    // Composition keywords
    {
      feature: 'oneOf',
      message: 'oneOf is not supported (use anyOf instead)',
    },
    { feature: 'allOf', message: 'allOf is not supported' },
    { feature: 'not', message: 'not is not supported' },

    // Conditional keywords
    { feature: 'if', message: 'if/then/else conditionals are not supported' },

    // Recursive schemas
    { feature: 'recursive', message: 'Recursive schemas are not supported' },

    // String constraints
    { feature: 'pattern', message: 'pattern constraint is not supported' },
    { feature: 'minLength', message: 'minLength constraint is not supported' },
    { feature: 'maxLength', message: 'maxLength constraint is not supported' },

    // Numerical constraints (exclusive variants and multipleOf)
    {
      feature: 'exclusiveMinimum',
      message: 'exclusiveMinimum is not supported (use minimum instead)',
    },
    {
      feature: 'exclusiveMaximum',
      message: 'exclusiveMaximum is not supported (use maximum instead)',
    },
    { feature: 'multipleOf', message: 'multipleOf is not supported' },

    // Object constraints
    {
      feature: 'dependentRequired',
      message: 'dependentRequired is not supported',
    },
    {
      feature: 'dependentSchemas',
      message: 'dependentSchemas is not supported',
    },
    {
      feature: 'patternProperties',
      message: 'patternProperties is not supported',
    },
    { feature: 'propertyNames', message: 'propertyNames is not supported' },

    // Array constraints
    { feature: 'uniqueItems', message: 'uniqueItems is not supported' },
    { feature: 'contains', message: 'contains is not supported' },
    { feature: 'additionalItems', message: 'additionalItems is not supported' },

    // Enum constraints - only primitives allowed
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
