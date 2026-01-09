import type {
  CustomValidator,
  ProviderConstraints,
  ValidationIssue,
} from '../../types.js';

/**
 * Custom validator to check that all properties are required
 */
const allPropertiesRequiredValidator: CustomValidator = {
  name: 'allPropertiesRequired',
  validate: (schema, path, isRoot): ValidationIssue[] => {
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
};

/**
 * Custom validator to check additionalProperties is false
 */
const additionalPropertiesFalseValidator: CustomValidator = {
  name: 'additionalPropertiesFalse',
  validate: (schema, path, isRoot): ValidationIssue[] => {
    if (schema.type === 'object' || schema.properties) {
      if (schema.additionalProperties !== false) {
        return [
          {
            path: [...path],
            feature: 'additionalPropertiesNotFalse',
            message: 'additionalProperties must be explicitly set to false',
          },
        ];
      }
    }
    return [];
  },
};

/**
 * OpenAI constraints
 *
 * Based on: https://platform.openai.com/docs/guides/structured-outputs#supported-schemas
 *
 * OpenAI supports a subset of JSON Schema:
 * - Supported types: string, number, integer, boolean, object, array, enum, anyOf (within properties)
 * - NOT supported at root level: anyOf
 * - NOT supported anywhere: oneOf, allOf, not, if/then/else, dependentRequired, dependentSchemas
 * - Required: All properties must be in `required` array
 * - Required: `additionalProperties: false`
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
    {
      feature: 'patternProperties',
      message: 'patternProperties is not supported',
    },
  ],
  customValidators: [
    allPropertiesRequiredValidator,
    additionalPropertiesFalseValidator,
  ],
};
