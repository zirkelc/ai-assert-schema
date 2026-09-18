/**
 * Azure OpenAI constraints for ai-assert-schema
 *
 * @example
 * ```ts
 * import { azureConstraints } from 'ai-assert-schema/constraints/azure';
 * import { assertSchema } from 'ai-assert-schema';
 *
 * // Use with a custom Azure deployment name
 * assertSchema({
 *   schema: mySchema,
 *   model: 'azure/my-deployment',
 *   constraints: azureConstraints,
 * });
 * ```
 */
export { azureConstraints } from './azure.js';
