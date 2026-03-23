/**
 * Multi-Model Validation Example
 *
 * This example demonstrates how ai-assert-schema validates schemas against
 * multiple AI providers simultaneously, detecting provider-specific incompatibilities.
 *
 * The schema below intentionally uses features that fail for different providers:
 * - `minimum`/`maximum` constraints → fails Anthropic (not supported)
 * - Optional properties → fails OpenAI (requires all properties in `required`)
 */
import { z } from 'zod';
import { assertSchema } from '../src/index.js';

const schema = z.object({
  name: z.string(),
  age: z.number().min(0).max(150), // fails Anthropic (minimum/maximum not supported)
  nickname: z.string().optional(), // fails OpenAI (optional properties not supported)
});

try {
  assertSchema({
    schema,
    model: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514'],
  });
  console.log('Schema is valid for all providers');
} catch (error) {
  console.error(error.name, error.message);
}
