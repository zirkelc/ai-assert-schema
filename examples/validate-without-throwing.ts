/**
 * Validate Without Throwing Example
 *
 * This example demonstrates how to use `assertSchema.validate()` to check
 * schema compatibility without throwing an error. This is useful when you
 * want to handle validation issues programmatically.
 *
 * Run with: pnpm tsx examples/validate-without-throwing.ts
 */
import { z } from 'zod';
import { assertSchema, SchemaAssertionError } from '../src/index.js';

const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

/**
 * This schema intentionally uses features that are not supported:
 * - `z.discriminatedUnion()` produces `oneOf` which is not supported by OpenAI
 * - `z.optional()` makes the property not required, which fails OpenAI
 */
const schema = z
  .object({
    name: z.string().optional(),
    animal: z.discriminatedUnion('type', [Dog, Cat]),
  })
  .strict();

const result = assertSchema.validate({
  schema,
  model: 'openai/gpt-4o',
});

if (!result.success) {
  console.warn('Schema has compatibility issues:');

  for (const model of result.models) {
    console.warn(`${model.provider}/${model.modelId}:`);

    for (const issue of model.issues) {
      console.warn(`- ${issue.message}`);
    }
  }

  console.warn('');
  console.warn('SchemaAssertionError output:');
  console.error(new SchemaAssertionError(result).message);
}
