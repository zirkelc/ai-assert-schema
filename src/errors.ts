import type { JSONSchema, ValidationIssue } from './types.js';

export interface SchemaAssertionErrorOptions {
  issues: ValidationIssue[];
  provider: string;
  modelId: string;
  jsonSchema: JSONSchema;
}

/**
 * Error thrown when schema assertion fails
 */
export class SchemaAssertionError extends Error {
  readonly issues: ValidationIssue[];
  readonly provider: string;
  readonly modelId: string;
  readonly jsonSchema: JSONSchema;

  constructor(options: SchemaAssertionErrorOptions) {
    const { issues, provider, modelId, jsonSchema } = options;

    const components = issues.map((issue) => {
      const path = issue.path.length > 0 ? ` at "${issue.path.join('.')}"` : '';
      return `${issue.feature}${path}`;
    });

    const message = `The schema contains unsupported components for ${provider}/${modelId}: ${components.join(', ')}`;

    super(message);

    this.name = 'SchemaAssertionError';
    this.issues = issues;
    this.provider = provider;
    this.modelId = modelId;
    this.jsonSchema = jsonSchema;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaAssertionError);
    }
  }
}
