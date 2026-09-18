import type { ProviderConstraints, ValidationIssue } from '../../types.js';

/**
 * OpenAI constraints
 *
 * Based on: https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas
 *
 * OpenAI supports a subset of JSON Schema:
 * - Supported types: string, number, integer, boolean, object, array, enum, anyOf (within properties)
 * - Supported string properties: pattern, format (date-time, time, date, duration, email, hostname, ipv4, ipv6, uuid)
 * - Supported number properties: multipleOf, maximum, exclusiveMaximum, minimum, exclusiveMinimum
 * - Supported array properties: minItems, maxItems
 * - NOT supported: string length constraints (minLength, maxLength), they are not in the supported list for any model
 * - NOT supported at root level: anyOf
 * - NOT supported anywhere: oneOf, allOf, not, if/then/else, dependentRequired, dependentSchemas
 * - Required: All properties must be in `required` array
 * - Required: `additionalProperties: false`
 * - Enum: only primitive values (strings, numbers, booleans, null) - no complex types (objects, arrays)
 *
 * With `strict: true`, the API returns an error for a schema that uses an unsupported keyword.
 * Fine-tuned models also do not support pattern, format, minimum, maximum, multipleOf,
 * minItems and maxItems. This table follows the base models.
 */
export const openaiConstraints: ProviderConstraints = {
  provider: 'openai',
  unsupported: [
    {
      feature: 'rootAnyOf',
      context: 'root',
      message: 'anyOf is not supported at root level',
    },
    {
      feature: 'oneOf',
      message: 'oneOf is not supported (use anyOf within properties instead)',
    },
    { feature: 'allOf', message: 'allOf is not supported' },
    { feature: 'not', message: 'not is not supported' },
    {
      feature: 'dependentRequired',
      message: 'dependentRequired is not supported',
    },
    {
      feature: 'dependentSchemas',
      message: 'dependentSchemas is not supported',
    },
    { feature: 'if', message: 'if/then/else conditionals are not supported' },
    // String constraints
    { feature: 'minLength', message: 'minLength constraint is not supported' },
    { feature: 'maxLength', message: 'maxLength constraint is not supported' },
    {
      feature: 'patternProperties',
      message: 'patternProperties is not supported',
    },
    {
      feature: 'additionalProperties',
      allowedValues: [false],
      message: 'additionalProperties must be explicitly set to false',
    },
    {
      feature: 'optionalProperties',
      validate: (schema, path): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];

        if (schema.properties) {
          const props = Object.keys(schema.properties);
          const required = schema.required || [];
          const optional = props.filter((p) => !required.includes(p));

          if (optional.length > 0) {
            issues.push({
              path: [...path],
              feature: 'optionalProperties',
              message: `All properties must be required. Optional properties found: ${optional.join(', ')}`,
            });
          }
        }

        return issues;
      },
    },
    {
      feature: 'enum',
      validate: (schema, path): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];
        if (schema.enum && Array.isArray(schema.enum)) {
          const hasComplexTypes = schema.enum.some((val) => val !== null && typeof val === 'object');
          if (hasComplexTypes) {
            issues.push({
              path: [...path],
              feature: 'enum',
              message: 'Enum values must be strings, numbers, booleans, or null - complex types are not supported',
            });
          }
        }
        return issues;
      },
    },
  ],
};
