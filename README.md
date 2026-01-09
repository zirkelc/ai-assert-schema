<div align='center'>

# ai-assert-schema

<p align="center">Assert schemas for compatibility against your AI models</p>
<p align="center">
  <a href="https://www.npmjs.com/package/ai-assert-schema" alt="ai-assert-schema"><img src="https://img.shields.io/npm/dt/ai-assert-schema?label=ai-assert-schema"></a> <a href="https://github.com/zirkelc/ai-assert-schema/actions/workflows/ci.yml" alt="CI"><img src="https://img.shields.io/github/actions/workflow/status/zirkelc/ai-assert-schema/ci.yml?branch=main"></a>
</p>

</div>

## Why?

AI providers like OpenAI only support a [subset of JSON Schema](https://platform.openai.com/docs/guides/structured-outputs) for structured outputs and tool calling. If you use unsupported features, you may get invalid data not matching your schema or an error at runtime. This library validates your schemas against the constraints of your chosen AI model, so you can catch issues early and transparently.

## Installation

```bash
npm install ai-assert-schema
```

## Usage

This library works with any [Standard JSON Schema](https://standardschema.dev/json-schema) library (Zod, ArkType, Valibot) or raw JSON Schema objects. It can be used at run-time or test-time in your unit tests.

```typescript
import { assertSchema } from 'ai-assert-schema';
import { z } from 'zod';

const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

const validSchema = z.object({
  // Nullable is allowed
  name: z.string().nullable(),
  // z.union() produces anyOf
  animal: z.union([Dog, Cat]),
});

const invalidSchema = z.object({
  // Optional is not allowed
  name: z.string().optional(),
  // z.discriminatedUnion() produces oneOf
  animal: z.discriminatedUnion('type', [Dog, Cat]),
});

// Returns the schema if valid
assertSchema({ schema: validSchema, model: 'openai/gpt-4o-mini' });
assertSchema({ schema: validSchema, model: { provider: 'openai', modelId: 'gpt-4o-mini' } });

// Throws an error if invalid
assertSchema({ schema: invalidSchema, model: 'openai/gpt-4o-mini' });
assertSchema({ schema: invalidSchema, model: { provider: 'openai', modelId: 'gpt-4o-mini' } });
```

### Assert at Run-time

Wrap your schema and model with `assertSchema({ schema, model })`. If the schema is valid, it will be returned unchanged. Otherwise, an error will be thrown before making the API call.

> [NOTE!] This example uses the [AI SDK](https://www.npmjs.com/package/ai) to pass the model, but you can also provide a string or plain object.

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { assertSchema } from 'ai-assert-schema';
import { z } from 'zod';

const model = openai('gpt-4o-mini');

const result = await generateText({
  model,
  prompt: 'Describe a dog that barks',
  output: Output.object({
    schema: assertSchema({ schema, model }),
  }),
});
```

### Assert at Test-time

Validate schemas in your test suite to catch issues during CI:

```typescript
import { expect, test } from 'vitest';
import { assertSchema } from 'ai-assert-schema';

// Import your schema and model to test
import { yourSchema, yourModel } from './your-schema-file';

test('schema should be compatible with the model', () => {
  expect(() =>
    assertSchema({ schema: yourSchema, model: yourModel })
  ).not.toThrow();
});
```

## Providers

Currently, only OpenAI is supported. More providers will be added in the future.

### OpenAI

OpenAI's Structured Outputs have specific JSON Schema requirements. See the full constraint implementation in [`src/constraints/providers/openai.ts`](src/constraints/providers/openai.ts).

**Unsupported JSON Schema features:**
- `oneOf`
- `allOf`
- `not`
- `anyOf` at root level
- `if/then/else` conditionals
- `dependentRequired`, `dependentSchemas`
- `patternProperties`

**Required constraints:**
- All properties must be required
- Must use `additionalProperties: false`

#### Examples

**Discriminated Union vs Union**

Discriminated unions created with `z.discriminatedUnion()` convert to `oneOf` in JSON Schema, which is **not supported** by OpenAI.

```typescript
const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

z.object({
  animal: z.discriminatedUnion('type', [Dog, Cat]),
});
```

```json
{
  "properties": {
    "animal": {
      // 'oneOf' is not supported by OpenAI 
      "oneOf": [{ "type": "object", ... }, { "type": "object", ... }]
    }
  }
}
```

Union created with `z.union()` converts to `anyOf` in JSON Schema, which is supported by OpenAI.

```typescript
const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

z.object({
  animal: z.union([Dog, Cat]),
});
```

```json
{
  "properties": {
    "animal": {
      // 'anyOf' is supported by OpenAI
      "anyOf": [{ "type": "object", ... }, { "type": "object", ... }]
    }
  }
}
```

**Optional vs Nullable**

All properties must be required. Using `z.optional()` removes the property from the `required` array, which is **not supported** by OpenAI.

```typescript
z.object({
  name: z.string().optional(),
});
```

```jsonc
{
  "properties": {
    "name": { "type": "string" }
  },
  "required": [] // 'name' is not required
}
```

Using `z.nullable()` keeps the property required, but allows `null` as a valid type, which **is supported** by OpenAI.

```typescript
z.object({
  name: z.string().nullable(),
});
```

```json
{
  "properties": {
    "name": { "type": ["string", "null"] }
  },
  "required": ["name"] // 'name' is required
}
```

## Contributing

Contributions are welcome!

- **Add new providers**: Submit a PR with constraints for other AI providers (Anthropic, Google, etc.)
- **Fix constraints**: If you find incorrect constraints, please open an issue or PR
- **Provider implementations**: See [`src/constraints/providers/`](src/constraints/providers/) for examples

## API

```typescript
function assertSchema<SCHEMA extends SchemaInput>(
  options: AssertSchemaOptions<SCHEMA>
): SCHEMA
```

**Parameters:**
- `model` - Model identifier as `'provider/model-id'` string or `{ provider, modelId }` object
- `schema` - Your schema (Zod, Standard Schema, or JSON Schema object)

**Returns:** The input schema unchanged (for chaining)

**Throws:** `SchemaAssertionError` when the schema contains unsupported features

## License

MIT
