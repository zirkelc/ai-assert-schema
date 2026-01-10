export { assertSchema } from './assert.js';

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
  // Core types for defining constraints
  ProviderConstraints,
  ProviderPattern,
  // Registry types for programmatic registration
  ProviderRegistryEntry,
  SchemaFeature,
  SchemaInput,
  ValidationFailure,
  // Result types
  ValidationIssue,
  ValidationResult,
  ValidationSuccess,
} from './types.js';
