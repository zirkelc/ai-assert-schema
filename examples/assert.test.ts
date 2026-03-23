import { tool } from 'ai';
import { assertSchema, type SchemaInput } from 'ai-assert-schema';
import { describe, expect, test } from 'vitest';
import z from 'zod';

// Import model and tools from your existing files
const model = 'openai/gpt-4o';

const tools = {
  getWeather: tool({
    description: 'Get the weather for a location',
    inputSchema: z.union([z.object({ city: z.string() }), z.object({ lat: z.number(), lon: z.number() })]),
  }),
  searchProducts: tool({
    description: 'Search for products',
    inputSchema: z.object({
      query: z.string(),
      limit: z.number().optional(),
    }),
  }),
};

describe('tool schema compatibility', () => {
  test.each(Object.entries(tools))('%s inputSchema is compatible', (name, tool) => {
    expect(() => assertSchema({ schema: tool.inputSchema as SchemaInput, model }), name).not.toThrow();
  });
});
