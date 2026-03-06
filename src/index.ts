export { assertSchema } from './assert.js';

export { SchemaAssertionError } from './errors.js';

// Export types for custom provider implementations
export type {
  ConstraintRule,
  CustomValidator,
  FeatureContext,
  // Schema types
  JSONSchema,
  JSONSchemaIO,
  JSONSchemaTarget,
  // Model types
  ModelIdentifier,
  ModelObject,
  ModelString,
  ModelValidationResult,
  // Core types for defining constraints
  ProviderConstraints,
  ProviderPattern,
  // Registry types for programmatic registration
  ProviderRegistryEntry,
  SchemaFeature,
  SchemaInput,
  SchemaValidationResult,
  // Result types
  ValidationIssue,
} from './types.js';
