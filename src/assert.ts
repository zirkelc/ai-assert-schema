import { providerRegistry } from './constraints/registry.js';
import { validateSchemaConstraints } from './constraints/validate.js';
import { SchemaAssertionError } from './errors.js';
import { parseModel } from './model.js';
import { extractJSONSchema } from './schema.js';
import type {
  AssertSchemaOptions,
  SchemaInput,
  ValidateSchemaOptions,
  ValidationResult,
} from './types.js';

/**
 * Validate a schema against AI model constraints without throwing
 *
 * @example
 * ```ts
 * const result = validateSchema({
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
export function validateSchema<T extends SchemaInput>(
  options: ValidateSchemaOptions<T>,
): ValidationResult {
  const { model, schema, target, io } = options;

  // Parse model identifier into object
  const parsedModel = parseModel(model);

  // Get constraints for provider/model
  const constraints = providerRegistry.resolve(parsedModel);

  // Extract JSON Schema (priority: options.target > constraints.jsonSchemaTarget > default)
  const jsonSchemaTarget = target ?? constraints.jsonSchemaTarget;
  const jsonSchema = extractJSONSchema(schema, jsonSchemaTarget, io);

  // Validate schema against constraints
  const issues = validateSchemaConstraints(jsonSchema, constraints);

  return issues.length === 0
    ? {
        success: true,
        jsonSchema,
        modelId: constraints.modelId,
        provider: constraints.provider,
      }
    : {
        success: false,
        issues,
        jsonSchema,
        modelId: constraints.modelId,
        provider: constraints.provider,
      };
}

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
