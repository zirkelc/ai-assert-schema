// Main functions
export { assertSchema, validateSchema } from './assert.js';

// Registry utilities (for extensibility)
export { ProviderRegistry, providerRegistry } from './constraints/registry.js';

// Error class
export { SchemaAssertionError } from './errors.js';

// Model utilities
export { parseModel } from './model.js';

// Schema utilities
export {
  DEFAULT_JSON_SCHEMA_IO,
  DEFAULT_JSON_SCHEMA_TARGET,
  extractJSONSchema,
  hasJSONSchemaSupport,
  isJSONSchema,
  isStandardSchema,
} from './schema.js';

// Types
export type {
  // Schema input types
  AssertSchemaOptions,
  // Constraint types
  ConstraintRule,
  CustomValidator,
  FeatureContext,
  // JSON Schema types
  JSONSchema,
  JSONSchemaIO,
  JSONSchemaTarget,
  // Model types
  ModelIdentifier,
  ModelObject,
  ModelString,
  ParsedModel,
  ProviderConstraints,
  ProviderPattern,
  ProviderRegistryEntry,
  ResolvedConstraints,
  SchemaFeature,
  SchemaInput,
  // Standard Schema types (re-exported from @standard-schema/spec)
  StandardJSONSchemaV1,
  StandardSchemaV1,
  ValidateSchemaOptions,
  // Validation types
  ValidationFailure,
  ValidationIssue,
  ValidationResult,
  ValidationSuccess,
} from './types.js';
