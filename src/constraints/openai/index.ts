/**
 * OpenAI constraints for ai-assert-schema
 *
 * @example
 * ```ts
 * import { openaiConstraints } from 'ai-assert-schema/constraints/openai';
 * import { assertSchema } from 'ai-assert-schema';
 *
 * // Use with custom provider that has OpenAI-compatible constraints
 * assertSchema({
 *   schema: mySchema,
 *   model: 'my-openai-compatible/model',
 *   constraints: openaiConstraints,
 * });
 * ```
 */
export { openaiConstraints } from './openai.js';
