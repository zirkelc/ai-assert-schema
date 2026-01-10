import { providerRegistry } from './constraints/registry.js';
import { validateSchema } from './constraints/validate.js';
import { SchemaAssertionError } from './errors.js';
import type { AssertSchemaOptions, SchemaInput } from './types.js';

/**
 * Assert a schema is valid for an AI model, throwing if invalid
 *
 * Returns the input schema for chaining, allowing inline use:
 *
 * @example
 * ```ts
 * // Inline assertion with AI SDK
 * import { openai } from '@ai-sdk/openai';
 * import { generateText, Output } from 'ai';
 * import { assertSchema } from 'ai-assert-schema';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number().int()
 * });
 *
 * const model = openai('gpt-4o-mini');
 *
 * const result = await generateText({
 *   model,
 *   prompt: 'Describe a dog that barks',
 *   output: Output.object({
 *     schema: assertSchema({ schema, model }), // Returns schema if valid, throws if not
 *   }),
 * });
 * ```
 *
 * @example
 * ```ts
 * // With Standard Schema (Zod)
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 *   age: z.number().int()
 * });
 *
 * const validatedSchema = assertSchema({
 *   schema,
 *   model: 'openai/gpt-4o'
 * });
 * ```
 *
 * @example
 * ```ts
 * // With raw JSON Schema
 * const schema = assertSchema({
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       name: { type: 'string' },
 *       age: { type: 'number' }
 *     },
 *     required: ['name', 'age'],
 *     additionalProperties: false
 *   },
 *   model: { provider: 'openai', modelId: 'gpt-4o' }
 * });
 * ```
 *
 * @throws {SchemaAssertionError} When schema contains unsupported features
 */
export function assertSchema<SCHEMA extends SchemaInput>(
  options: AssertSchemaOptions<SCHEMA>,
): SCHEMA {
  const result = validateSchema(options);

  if (!result.success) {
    const { issues, jsonSchema, modelId, provider } = result;

    throw new SchemaAssertionError({
      issues,
      provider,
      modelId,
      jsonSchema: jsonSchema,
    });
  }

  return options.schema;
}
/**
 * Registry for provider constraints.
 * Use this to register custom providers or override existing ones.
 *
 * @example
 * ```ts
 * import { assertSchema } from 'ai-assert-schema';
 *
 * // Register constraints for a custom provider
 * assertSchema.registry.register({
 *   pattern: /^my-provider\/.+$/,
 *   constraints: {
 *     provider: 'my-provider',
 *     unsupported: [
 *       { feature: 'anyOf', message: 'anyOf is not supported' },
 *     ],
 *   },
 * });
 *
 * // Now assertSchema will use these constraints
 * assertSchema({
 *   schema: mySchema,
 *   model: 'my-provider/my-model',
 * });
 * ```
 */
assertSchema.registry = providerRegistry;

/**
 * Validate a schema against AI model constraints without throwing.
 *
 * @example
 * ```ts
 * import { assertSchema } from 'ai-assert-schema';
 *
 * const result = assertSchema.validate({
 *   schema: mySchema,
 *   model: 'openai/gpt-4o'
 * });
 *
 * if (!result.success) {
 *   console.warn('Schema has compatibility issues:');
 *   for (const issue of result.issues) {
 *     console.warn(`  - ${issue.message}`);
 *   }
 * }
 * ```
 */
assertSchema.validate = validateSchema;
