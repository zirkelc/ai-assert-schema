<div align='center'>

# ai-assert-schema

<p align="center">Assert schemas for compatibility against your AI models</p>
<p align="center">
  <a href="https://www.npmjs.com/package/ai-assert-schema" alt="ai-assert-schema"><img src="https://img.shields.io/npm/dt/ai-assert-schema?label=ai-assert-schema"></a> <a href="https://github.com/zirkelc/ai-assert-schema/actions/workflows/ci.yml" alt="CI"><img src="https://img.shields.io/github/actions/workflow/status/zirkelc/ai-assert-schema/ci.yml?branch=main"></a>
</p>

</div>

## Why?

AI providers like OpenAI only support a [subset of JSON Schema](https://platform.openai.com/docs/guides/structured-outputs) for structured outputs and tool calling. If you use unsupported features, you may get invalid data not matching your schema or an error at runtime. This library validates your schemas against the constraints of your chosen AI model, so you can catch issues early and transparently.

### Examples

Two typical examples of unsupported JSON schema features are optional properties and discriminated unions.

> [!TIP] 
> The following examples use Zod for schema definitions, but the same concepts apply to other JSON Schema libraries or raw JSON Schema objects.

**Optional vs Nullable**

Using `z.optional()` removes the property from the `required` array, which is **not supported** by OpenAI. Use `z.nullable()` instead, which keeps the property required but allows `null` as a valid type.

```typescript
z.object({
  optional: z.string().optional(),
  nullable: z.string().nullable(),
});
```

```jsonc
{
  "properties": {
    "optional": { "type": "string" },
    "nullable": { "type": ["string", "null"] }
  },
  "required": ["nullable"] // 'optional' is not required, 'nullable' is required
}
```

**Discriminated Union vs Union**

Discriminated unions created with `z.discriminatedUnion()` convert to `oneOf` in JSON Schema, which is **not supported** by OpenAI. Use `z.union()` instead, which converts to `anyOf` and is supported.

```typescript
const Dog = z.object({ type: z.literal('dog'), bark: z.boolean() });
const Cat = z.object({ type: z.literal('cat'), meow: z.boolean() });

z.object({
  discriminatedUnion: z.discriminatedUnion('type', [Dog, Cat]),
  union: z.union([Dog, Cat]),
});
```

```jsonc
{
  "properties": {
    "discriminatedUnion": {
      // 'oneOf' is not supported by OpenAI 
      "oneOf": [{ "type": "object", ... }, { "type": "object", ... }]
    },
    "union": {
      // 'anyOf' is supported by OpenAI
      "anyOf": [{ "type": "object", ... }, { "type": "object", ... }]
    }
  }
}
```

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

> [!TIP] 
> This example uses the [AI SDK](https://www.npmjs.com/package/ai) to pass the model, but you can also provide a string or plain object.

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

### Validate without Throwing

Use `assertSchema.validate()` to check schema compatibility without throwing an error:

```typescript
import { assertSchema } from 'ai-assert-schema';

const result = assertSchema.validate({
  schema: mySchema,
  model: 'openai/gpt-4o',
});

if (!result.success) {
  console.warn('Schema has compatibility issues:');
  for (const issue of result.issues) {
    console.warn(`  - ${issue.message}`);
  }
}
```

### Inline Constraints

Pass constraints directly instead of relying on the provider registry:

```typescript
import { assertSchema } from 'ai-assert-schema';
import { openaiConstraints } from 'ai-assert-schema/constraints/openai';

// Use OpenAI constraints with a custom or unknown provider
assertSchema({
  schema: mySchema,
  model: 'my-custom-provider/model',
  constraints: openaiConstraints,
});
```

## Providers

Currently supported providers: OpenAI, Anthropic, Google.

### Register Custom Providers

Register custom providers using `assertSchema.registry`:

```typescript
import { assertSchema } from 'ai-assert-schema';

// Register constraints for a custom provider
assertSchema.registry.register({
  // Matching 'my-provider/*' models
  pattern: /^my-provider\/.+$/,
  constraints: {
    provider: 'my-provider',
    unsupported: [
      { feature: 'anyOf', message: 'anyOf is not supported' },
      { feature: 'oneOf', message: 'oneOf is not supported' },
    ],
  },
});

// Now assertSchema will use these constraints for matching models
assertSchema({
  schema: mySchema,
  model: 'my-provider/my-model',
});
```

#### Provider Aliases

You can also register aliases that reference built-in providers (`'openai'`, `'anthropic'`, or `'google'`) instead of providing full constraints:

```typescript
import { assertSchema } from 'ai-assert-schema';

// Register an alias that uses OpenAI constraints
assertSchema.registry.register({
  pattern: /^my-openai-compatible\/.+$/,
  provider: 'openai',  // Uses built-in OpenAI constraints
});

// Register an alias that uses Anthropic constraints
assertSchema.registry.register({
  pattern: /^my-anthropic-compatible\/.+$/,
  provider: 'anthropic',  // Uses built-in Anthropic constraints
});
```

#### Pattern Matching

Patterns can be strings or regular expressions. The registry will always match exact strings first, then iterate over all regex patterns with later registrations taking precedence over earlier ones.

```typescript
import { assertSchema } from 'ai-assert-schema';

assertSchema.registry.register({
  // Exact match for 'anthropic/claude-4'
  pattern: 'anthropic/claude-4',
  constraints: {},
});

assertSchema.registry.register({
  // Matching all 'anthropic/*' models
  pattern: /anthropic\/.+$/,
  constraints: {},
});

// Matches exact string first
assertSchema({
  schema: mySchema,
  model: 'anthropic/claude-4',
});
```

### OpenAI

The built-in registry resolves OpenAI models using the following patterns:

- `'openai/*'`
- `'openai.chat/*'`
- `'openai.responses/*'`

#### Constraints

OpenAI's Structured Outputs have specific [JSON Schema constraints](https://platform.openai.com/docs/guides/structured-outputs). See the full constraint implementation in [`src/constraints/openai/openai.ts`](src/constraints/openai/openai.ts).

> [!WARNING] 
> The constraints were implemented following the official documentation. If you find any discrepancies with actual behavior, please open an issue.

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

##### Register OpenAI-Compatible Providers

```typescript
import { assertSchema } from 'ai-assert-schema';

assertSchema.registry.register({
  // Match your custom provider
  pattern: 'my-provider/openai-compatible',
  // Use built-in OpenAI constraints
  provider: 'openai',
});
```

### Azure OpenAI

Azure OpenAI uses the same constraints as OpenAI. The built-in registry resolves Azure models using the following patterns:

- `'azure/*openai*'`
- `'azure.chat/*openai*'`
- `'azure.responses/*openai*'`

If your deployment names do not follow this pattern, you can register custom patterns using `assertSchema.registry.register()`:

```typescript
import { assertSchema } from 'ai-assert-schema';

assertSchema.registry.register({
  // Match your custom Azure deployment name
  pattern: 'azure/my-deployment-name',
  // Use built-in OpenAI constraints
  provider: 'openai',
});
```

### Anthropic

The built-in registry resolves Anthropic models using the following patterns:

- `'anthropic/*'`
- `'anthropic.messages/*'`

#### Constraints

Anthropic's Structured Outputs have specific [JSON Schema constraints](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations). See the full constraint implementation in [`src/constraints/anthropic/anthropic.ts`](src/constraints/anthropic/anthropic.ts).

> [!WARNING] 
> The constraints were implemented following the official documentation. If you find any discrepancies with actual behavior, please open an issue.

**Unsupported JSON Schema features:**
- Recursive schemas
- Numerical constraints (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`)
- String constraints (`minLength`, `maxLength`)
- Array constraints (`maxItems`, `uniqueItems`, `contains`, `minItems` > 1)

**Required constraints:**
- Must use `additionalProperties: false`

##### Register Anthropic-Compatible Providers

```typescript
import { assertSchema } from 'ai-assert-schema';

assertSchema.registry.register({
  // Match your custom provider
  pattern: 'my-provider/claude-compatible',
  // Use built-in Anthropic constraints
  provider: 'anthropic',
});
```

### Google

The built-in registry resolves Google models using the following patterns:

- `'google.generative-ai/*'`
- `'google.vertex.chat/*'`
- `'google.vertex/*'`

#### Constraints

Google Gemini's Structured Outputs (Gemini 2.0+) have specific [JSON Schema constraints](https://ai.google.dev/gemini-api/docs/structured-output#json_schema_support). See the full constraint implementation in [`src/constraints/google/google.ts`](src/constraints/google/google.ts).

> [!WARNING] 
> The constraints were implemented following the official documentation. If you find any discrepancies with actual behavior, please open an issue.

**Unsupported JSON Schema features:**
- `oneOf`
- `allOf`
- `not`
- `if/then/else` conditionals
- `pattern`, `minLength`, `maxLength` (string constraints)
- `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` (numerical constraints)
- `dependentRequired`, `dependentSchemas`
- `patternProperties`, `propertyNames`
- `uniqueItems`, `contains`, `additionalItems` (array constraints)
- Recursive schemas

##### Register Google-Compatible Providers

```typescript
import { assertSchema } from 'ai-assert-schema';

assertSchema.registry.register({
  // Match your custom provider
  pattern: 'my-provider/google-compatible',
  // Use built-in Google constraints
  provider: 'google',
});
```

## Contributing

Contributions are welcome!

- **Add new providers**: Submit a PR with constraints for other AI providers
- **Fix constraints**: If you find incorrect constraints, please open an issue or PR
- **Provider implementations**: See [`src/constraints/openai/`](src/constraints/openai/) for examples

## API

### `assertSchema(options)`

```typescript
function assertSchema<SCHEMA extends SchemaInput>(
  options: AssertSchemaOptions<SCHEMA>
): SCHEMA
```

**Parameters:**
- `model` - Model identifier as `'provider/model-id'` string or `{ provider, modelId }` object
- `schema` - Your schema (Zod, Standard Schema, or JSON Schema object)
- `constraints` - (optional) Custom constraints to use instead of looking up from registry

**Returns:** The input schema unchanged (for chaining)

**Throws:** `SchemaAssertionError` when the schema contains unsupported features

### `assertSchema.validate(options)`

Same parameters as `assertSchema`, but returns a result object instead of throwing:

```typescript
type ValidationResult =
  | { success: true; provider: string; modelId: string; jsonSchema: JSONSchema }
  | { success: false; provider: string; modelId: string; jsonSchema: JSONSchema; issues: ValidationIssue[] }
```

### `assertSchema.registry`

The provider registry for registering custom constraints:

- `register({ pattern, provider })` - Register a pattern using built-in provider constraints (`'openai'` or `'anthropic'`)
- `register({ pattern, constraints })` - Register a pattern with custom constraints
- `resolve(model)` - Resolve constraints for a model
- `getAll()` - Get all registered patterns with their resolved constraints

## License

MIT
