/**
 * Google constraints for ai-assert-schema
 *
 * @example
 * ```ts
 * import { googleConstraints } from 'ai-assert-schema/constraints/google';
 * import { assertSchema } from 'ai-assert-schema';
 *
 * // Use with custom provider that has Google-compatible constraints
 * assertSchema({
 *   schema: mySchema,
 *   model: 'my-google-compatible/model',
 *   constraints: googleConstraints,
 * });
 * ```
 */
export { googleConstraints } from './google.js';
