import type { CustomValidator, ProviderConstraints, ValidationIssue } from '../../types.js';
import { openaiConstraints } from '../openai/openai.js';

/**
 * Keywords that Azure OpenAI rejects but that are not part of the common
 * feature set, so the traversal cannot detect them with simple rules.
 */
const unsupportedAzureKeywords = [
  'unevaluatedProperties',
  'minProperties',
  'maxProperties',
  'unevaluatedItems',
  'minContains',
  'maxContains',
] as const;

const unsupportedAzureKeywordsValidator: CustomValidator = {
  name: 'azureUnsupportedKeywords',
  validate: (schema, path): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const record = schema as Record<string, unknown>;

    for (const keyword of unsupportedAzureKeywords) {
      if (record[keyword] !== undefined) {
        issues.push({
          path: [...path],
          feature: keyword,
          message: `${keyword} is not supported`,
        });
      }
    }

    return issues;
  },
};

/**
 * Azure OpenAI constraints
 *
 * Based on: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs#json-schema-support-and-limitations
 *
 * Azure OpenAI supports the same JSON Schema subset as OpenAI, with stricter
 * Azure-specific limits that apply to both the Chat Completions and Responses APIs.
 * All OpenAI constraints apply. In addition, these type-specific keywords are NOT supported:
 * - String: minLength, maxLength, pattern, format
 * - Number: minimum, maximum, multipleOf
 * - Objects: patternProperties, unevaluatedProperties, propertyNames, minProperties, maxProperties
 * - Arrays: unevaluatedItems, contains, minContains, maxContains, minItems, maxItems, uniqueItems
 */
export const azureConstraints: ProviderConstraints = {
  provider: 'azure',
  unsupported: [
    ...openaiConstraints.unsupported,

    // String constraints
    { feature: 'minLength', message: 'minLength constraint is not supported' },
    { feature: 'maxLength', message: 'maxLength constraint is not supported' },
    { feature: 'pattern', message: 'pattern is not supported' },
    { feature: 'format', message: 'format is not supported' },

    // Numerical constraints
    { feature: 'minimum', message: 'minimum constraint is not supported' },
    { feature: 'maximum', message: 'maximum constraint is not supported' },
    { feature: 'multipleOf', message: 'multipleOf is not supported' },

    // Object constraints (patternProperties comes from the OpenAI rules)
    { feature: 'propertyNames', message: 'propertyNames is not supported' },

    // Array constraints
    { feature: 'minItems', message: 'minItems constraint is not supported' },
    { feature: 'maxItems', message: 'maxItems constraint is not supported' },
    { feature: 'uniqueItems', message: 'uniqueItems is not supported' },
    { feature: 'contains', message: 'contains is not supported' },
  ],
  customValidators: [...(openaiConstraints.customValidators ?? []), unsupportedAzureKeywordsValidator],
};
