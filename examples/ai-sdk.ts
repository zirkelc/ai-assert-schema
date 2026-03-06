/**
 * AI SDK Integration Example
 *
 * This example demonstrates how to use ai-assert-schema with the AI SDK
 * to validate schemas before making API calls. The schema is validated
 * against the model's constraints and passed to `Output.object()`.
 *
 * Run with: pnpm tsx examples/ai-sdk.ts
 * Note: Requires OPENAI_API_KEY environment variable to be set.
 */
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { assertSchema } from '../src/index.js';

const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

const schema = z
  .object({
    name: z.string(),
    animal: z.union([Dog, Cat]),
  })
  .strict();

const model = openai('gpt-4o-mini');

const result = await generateText({
  model,
  prompt: 'Describe a dog that barks',
  output: Output.object({
    schema: assertSchema({ schema, model }),
  }),
});

console.log(result.output);
