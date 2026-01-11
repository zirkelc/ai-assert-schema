import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from '@standard-schema/spec';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

/**
 * Re-export Standard Schema types from official package
 */
export type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from '@standard-schema/spec';

/**
 * Extended JSON Schema type that includes properties from Draft 2020-12
 * that we need to validate against provider constraints.
 *
 * Base is JSONSchema7 (Draft 7) since that's what AI SDK uses,
 * but we extend it with newer properties that may appear in schemas.
 */
export interface JSONSchema extends JSONSchema7 {
  // Draft 2020-12 properties
  /** Tuple validation (replaces array form of `items` in Draft 2020-12) */
  prefixItems?: JSONSchema7Definition[];

  // Draft 2019-09 properties (split from `dependencies`)
  /** Property dependency requirements */
  dependentRequired?: { [key: string]: string[] };
  /** Schema dependencies */
  dependentSchemas?: { [key: string]: JSONSchema7Definition };
}

/**
 * Model identifier as string format: 'provider/model-id'
 */
export type ModelString = `${string}/${string}`;

/**
 * Model identifier as object format (compatible with AI SDK LanguageModelV2/V3)
 */
export interface ModelObject {
  provider: string;
  modelId: string;
  [key: string]: unknown; // Allow additional properties from AI SDK models
}

/**
 * Union of supported model identifier formats
 */
export type ModelIdentifier = ModelString | ModelObject;

/**
 * Normalized model identifier
 */
export interface ParsedModel {
  provider: string;
  modelId: string;
  original: ModelIdentifier;
}

/**
 * Features that can be checked in JSON Schema
 */
export type SchemaFeature =
  // Composition keywords
  | 'allOf'
  | 'anyOf'
  | 'oneOf'
  | 'not'
  // Root-specific composition
  | 'rootAnyOf'
  | 'rootOneOf'
  // Conditional keywords
  | 'if'
  | 'then'
  | 'else'
  // Object keywords
  | 'dependentRequired'
  | 'dependentSchemas'
  | 'additionalProperties'
  | 'patternProperties'
  | 'propertyNames'
  // Array keywords
  | 'prefixItems'
  | 'additionalItems'
  | 'contains'
  | 'uniqueItems'
  // Validation keywords
  | 'minimum'
  | 'maximum'
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'format'
  | 'minItems'
  | 'maxItems'
  | 'multipleOf'
  // Special
  | '$ref'
  | 'recursive'
  | 'optionalProperties'
  | 'enum';

/**
 * Context for where a feature is used
 */
export type FeatureContext = 'root' | 'nested' | 'any';

/**
 * Base properties shared by all constraint rules
 */
interface ConstraintRuleBase {
  feature: SchemaFeature;
  context?: FeatureContext;
}

/**
 * Simple constraint rule - blocks a feature entirely or with allowedValues
 */
export interface SimpleConstraintRule extends ConstraintRuleBase {
  message?: string;
  /**
   * If specified, the feature is only invalid when its value is NOT in this list.
   * If undefined/empty, any use of the feature is invalid.
   *
   * @example
   * // additionalProperties must be false
   * { feature: 'additionalProperties', allowedValues: [false] }
   *
   * // minItems only allows 0 or 1
   * { feature: 'minItems', allowedValues: [0, 1] }
   */
  allowedValues?: (string | number | boolean | null)[];
}

/**
 * Custom constraint rule - uses a validate function for complex logic
 */
export interface CustomConstraintRule extends ConstraintRuleBase {
  validate: (
    schema: JSONSchema,
    path: string[],
    isRoot: boolean,
  ) => ValidationIssue[];
}

/**
 * Constraint rule - either simple (with message/allowedValues) or custom (with validate)
 */
export type ConstraintRule = SimpleConstraintRule | CustomConstraintRule;

/**
 * Issue found during validation
 */
export interface ValidationIssue {
  path: string[];
  feature: SchemaFeature | string;
  message: string;
}

/**
 * Custom validator for complex constraint logic
 */
export interface CustomValidator {
  name: string;
  validate: (
    schema: JSONSchema,
    path: string[],
    isRoot: boolean,
  ) => ValidationIssue[];
}

/** JSON Schema target versions */
export type JSONSchemaTarget = 'draft-2020-12' | 'draft-07' | 'openapi-3.0';

/**
 * JSON Schema IO mode for Standard Schema conversion
 *
 * Controls how Standard Schema libraries (like Zod) generate JSON Schema:
 *
 * - `'output'` (default): Generates schema representing the **output type** after parsing.
 *   For `z.object()`, this includes `additionalProperties: false` since Zod strips
 *   unknown properties. This matches `z.toJSONSchema()` default behavior.
 *
 * - `'input'`: Generates schema representing what the schema **accepts as input**.
 *   For `z.object()`, this does NOT include `additionalProperties` since Zod accepts
 *   objects with extra properties (it just strips them).
 *
 * **Important for OpenAI**: OpenAI structured outputs require `additionalProperties: false`
 * on all objects. Using `io: 'output'` (default) ensures this is set automatically.
 * If you use `io: 'input'`, you must use `.strict()` on all Zod object schemas.
 *
 * **Note on transforms**: `io: 'output'` will throw errors for schemas with transforms
 * that produce non-JSON types (e.g., `z.iso.date().pipe(z.coerce.date())` outputs `Date`).
 * Use `io: 'input'` for such schemas and add `.strict()` to objects.
 */
export type JSONSchemaIO = 'input' | 'output';

/**
 * Provider-level constraints
 */
export interface ProviderConstraints {
  provider: string;
  unsupported: ConstraintRule[];
  customValidators?: CustomValidator[];
  /** Override JSON Schema target for this provider (default: draft-07) */
  jsonSchemaTarget?: JSONSchemaTarget;
}

/**
 * Pattern for matching model identifiers
 * - string: Exact match (e.g., "openai/gpt-4o")
 * - RegExp: Pattern match (e.g., /^openai\/.+$/)
 */
export type ProviderPattern = string | RegExp;

/**
 * Registry entry mapping a pattern to constraints
 */
export interface ProviderRegistryEntry {
  pattern: ProviderPattern;
  constraints: ProviderConstraints;
}

/**
 * Resolved constraints for a specific provider/model combination
 */
export interface ResolvedConstraints {
  provider: string;
  modelId: string;
  unsupported: ConstraintRule[];
  customValidators: CustomValidator[];
  jsonSchemaTarget?: JSONSchemaTarget;
}

/**
 * Schema validation success result
 */
export interface ValidationSuccess {
  success: true;
  modelId: string;
  provider: string;
  jsonSchema: JSONSchema;
}

/**
 * Schema validation failure result
 */
export interface ValidationFailure {
  success: false;
  modelId: string;
  provider: string;
  jsonSchema: JSONSchema;
  issues: ValidationIssue[];
}

/**
 * Schema validation result - discriminated union
 */
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Schema input - can be Standard Schema, Standard JSON Schema, or raw JSON Schema
 */
export type SchemaInput = StandardSchemaV1 | StandardJSONSchemaV1 | JSONSchema;

/**
 * Options for validateSchema
 */
export interface ValidateSchemaOptions<
  SCHEMA extends SchemaInput = SchemaInput,
> {
  model: ModelIdentifier;
  schema: SCHEMA;
  /** Override JSON Schema target (default: draft-07, matching AI SDK) */
  target?: JSONSchemaTarget;
  /**
   * JSON Schema IO mode for Standard Schema conversion (default: 'output')
   *
   * - `'output'`: Includes `additionalProperties: false` on objects (matches `z.toJSONSchema()`)
   * - `'input'`: Does NOT include `additionalProperties` (requires `.strict()` on Zod objects)
   *
   * Use `'input'` if your schema has transforms that produce non-JSON types (e.g., Date).
   *
   * @default 'output'
   */
  io?: JSONSchemaIO;
  /**
   * Custom constraints to use instead of looking up from registry.
   * When provided, bypasses the provider registry lookup entirely.
   *
   * @example
   * ```ts
   * import { openaiConstraints } from 'ai-assert-schema/constraints/openai';
   *
   * assertSchema({
   *   schema: mySchema,
   *   model: 'custom-provider/model',
   *   constraints: openaiConstraints,
   * });
   * ```
   */
  constraints?: ProviderConstraints;
}

/**
 * Options for assertSchema (same as validateSchema, always throws on error)
 */
export type AssertSchemaOptions<SCHEMA extends SchemaInput = SchemaInput> =
  ValidateSchemaOptions<SCHEMA>;
