import type { SchemaValidationResult } from './types.js';

/**
 * Error thrown when schema assertion fails
 */
export class SchemaAssertionError extends Error {
  readonly result: SchemaValidationResult;

  constructor(result: SchemaValidationResult) {
    const { models } = result;

    const failedModels = models.filter((m) => m.issues.length > 0);
    const modelValidationMessages = failedModels.map((model) => {
      const issueCount = model.issues.length;
      const issueWord = issueCount === 1 ? 'issue' : 'issues';
      const issueLines = model.issues.map((issue, index) => {
        const path =
          issue.path.length > 0 ? ` at "${issue.path.join('.')}"` : '';
        return `  ${index + 1}. ${issue.feature}${path}`;
      });
      return `- ${model.provider}/${model.modelId} (${issueCount} ${issueWord}):\n${issueLines.join('\n')}`;
    });

    const message = `The schema contains unsupported components:\n${modelValidationMessages.join('\n')}`;

    super(message);

    this.name = 'SchemaAssertionError';
    this.result = result;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaAssertionError);
    }
  }
}
