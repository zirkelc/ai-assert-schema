import type {
  FeatureContext,
  JSONSchema,
  ResolvedConstraints,
  SchemaFeature,
  ValidationIssue,
} from '../types.js';

interface TraversalContext {
  path: string[];
  isRoot: boolean;
  constraints: ResolvedConstraints;
  issues: ValidationIssue[];
  visited: WeakSet<object>;
}

/**
 * Validate a JSON Schema against provider constraints
 * @internal This is an internal function - use validateSchema from assert-schema.ts instead
 */
export function validateSchemaConstraints(
  schema: JSONSchema,
  constraints: ResolvedConstraints,
): ValidationIssue[] {
  const ctx: TraversalContext = {
    path: [],
    isRoot: true,
    constraints,
    issues: [],
    visited: new WeakSet(),
  };

  traverseSchema(schema, ctx);

  return ctx.issues;
}

function traverseSchema(schema: JSONSchema, ctx: TraversalContext): void {
  // Cycle detection
  if (typeof schema === 'object' && schema !== null) {
    if (ctx.visited.has(schema)) {
      if (isFeatureUnsupported('recursive', ctx)) {
        ctx.issues.push({
          path: [...ctx.path],
          feature: 'recursive',
          message: 'Recursive schemas are not supported',
        });
      }
      return;
    }
    ctx.visited.add(schema);
  }

  // Check composition keywords
  checkCompositionKeywords(schema, ctx);

  // Check conditional keywords
  checkConditionalKeywords(schema, ctx);

  // Check validation keywords
  checkValidationKeywords(schema, ctx);

  // Check object-specific constraints
  if (schema.type === 'object' || schema.properties) {
    checkObjectConstraints(schema, ctx);

    // Recurse into properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (typeof propSchema === 'object' && propSchema !== null) {
          traverseSchema(propSchema as JSONSchema, {
            ...ctx,
            path: [...ctx.path, 'properties', key],
            isRoot: false,
          });
        }
      }
    }

    // Check additionalProperties if it's a schema
    if (
      typeof schema.additionalProperties === 'object' &&
      schema.additionalProperties !== null
    ) {
      traverseSchema(schema.additionalProperties, {
        ...ctx,
        path: [...ctx.path, 'additionalProperties'],
        isRoot: false,
      });
    }
  }

  // Check array-specific constraints
  if (schema.type === 'array' || schema.items) {
    checkArrayConstraints(schema, ctx);

    // Recurse into items
    if (schema.items) {
      if (Array.isArray(schema.items)) {
        schema.items.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            traverseSchema(item as JSONSchema, {
              ...ctx,
              path: [...ctx.path, 'items', String(i)],
              isRoot: false,
            });
          }
        });
      } else if (typeof schema.items === 'object') {
        traverseSchema(schema.items, {
          ...ctx,
          path: [...ctx.path, 'items'],
          isRoot: false,
        });
      }
    }

    // Recurse into prefixItems
    if (schema.prefixItems) {
      schema.prefixItems.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          traverseSchema(item, {
            ...ctx,
            path: [...ctx.path, 'prefixItems', String(i)],
            isRoot: false,
          });
        }
      });
    }
  }

  // Recurse into composition schemas
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    const schemas = schema[keyword];
    if (schemas && Array.isArray(schemas)) {
      schemas.forEach((subSchema, i) => {
        if (typeof subSchema === 'object' && subSchema !== null) {
          traverseSchema(subSchema as JSONSchema, {
            ...ctx,
            path: [...ctx.path, keyword, String(i)],
            isRoot: false,
          });
        }
      });
    }
  }

  // Recurse into conditional schemas
  for (const keyword of ['if', 'then', 'else'] as const) {
    const condSchema = schema[keyword];
    if (condSchema && typeof condSchema === 'object') {
      traverseSchema(condSchema as JSONSchema, {
        ...ctx,
        path: [...ctx.path, keyword],
        isRoot: false,
      });
    }
  }

  // Recurse into $defs/definitions
  const defs = schema.$defs || schema.definitions;
  if (defs) {
    for (const [key, defSchema] of Object.entries(defs)) {
      if (typeof defSchema === 'object' && defSchema !== null) {
        traverseSchema(defSchema as JSONSchema, {
          ...ctx,
          path: [...ctx.path, schema.$defs ? '$defs' : 'definitions', key],
          isRoot: false,
        });
      }
    }
  }

  // Run custom validators
  ctx.constraints.customValidators.forEach((validator) => {
    const issues = validator.validate(schema, ctx.path, ctx.isRoot);
    ctx.issues.push(...issues);
  });
}

function isFeatureUnsupported(
  feature: SchemaFeature,
  ctx: TraversalContext,
  currentContext?: FeatureContext,
): boolean {
  return ctx.constraints.unsupported.some((rule) => {
    if (rule.feature !== feature) return false;
    if (!rule.context || rule.context === 'any') return true;
    if (currentContext === undefined) return true;
    return rule.context === currentContext;
  });
}

function getFeatureMessage(
  feature: SchemaFeature,
  ctx: TraversalContext,
  defaultMessage: string,
): string {
  const rule = ctx.constraints.unsupported.find((r) => r.feature === feature);
  return rule?.message || defaultMessage;
}

function checkCompositionKeywords(
  schema: JSONSchema,
  ctx: TraversalContext,
): void {
  const context: FeatureContext = ctx.isRoot ? 'root' : 'nested';

  if (schema.allOf && isFeatureUnsupported('allOf', ctx, context)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'allOf',
      message: getFeatureMessage('allOf', ctx, 'allOf is not supported'),
    });
  }

  if (schema.anyOf) {
    // Check root-specific anyOf constraint
    if (ctx.isRoot && isFeatureUnsupported('rootAnyOf', ctx, 'root')) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: 'rootAnyOf',
        message: getFeatureMessage(
          'rootAnyOf',
          ctx,
          'anyOf is not supported at root level',
        ),
      });
    } else if (!ctx.isRoot && isFeatureUnsupported('anyOf', ctx, context)) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: 'anyOf',
        message: getFeatureMessage('anyOf', ctx, 'anyOf is not supported'),
      });
    }
  }

  if (schema.oneOf) {
    // Check root-specific oneOf constraint
    if (ctx.isRoot && isFeatureUnsupported('rootOneOf', ctx, 'root')) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: 'rootOneOf',
        message: getFeatureMessage(
          'rootOneOf',
          ctx,
          'oneOf is not supported at root level',
        ),
      });
    } else if (isFeatureUnsupported('oneOf', ctx, context)) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: 'oneOf',
        message: getFeatureMessage('oneOf', ctx, 'oneOf is not supported'),
      });
    }
  }

  if (schema.not && isFeatureUnsupported('not', ctx, context)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'not',
      message: getFeatureMessage('not', ctx, 'not is not supported'),
    });
  }
}

function checkConditionalKeywords(
  schema: JSONSchema,
  ctx: TraversalContext,
): void {
  if (schema.if && isFeatureUnsupported('if', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'if',
      message: getFeatureMessage(
        'if',
        ctx,
        'if/then/else conditionals are not supported',
      ),
    });
  }

  if (
    schema.dependentRequired &&
    isFeatureUnsupported('dependentRequired', ctx)
  ) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'dependentRequired',
      message: getFeatureMessage(
        'dependentRequired',
        ctx,
        'dependentRequired is not supported',
      ),
    });
  }

  if (
    schema.dependentSchemas &&
    isFeatureUnsupported('dependentSchemas', ctx)
  ) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'dependentSchemas',
      message: getFeatureMessage(
        'dependentSchemas',
        ctx,
        'dependentSchemas is not supported',
      ),
    });
  }
}

function checkValidationKeywords(
  schema: JSONSchema,
  ctx: TraversalContext,
): void {
  // These are actual JSON Schema keywords that also exist as SchemaFeature
  const numericKeywords = [
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
  ] as const;

  const stringKeywords = [
    'minLength',
    'maxLength',
    'pattern',
    'format',
  ] as const;

  for (const keyword of numericKeywords) {
    if (schema[keyword] !== undefined && isFeatureUnsupported(keyword, ctx)) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: keyword,
        message: getFeatureMessage(keyword, ctx, `${keyword} is not supported`),
      });
    }
  }

  for (const keyword of stringKeywords) {
    if (schema[keyword] !== undefined && isFeatureUnsupported(keyword, ctx)) {
      ctx.issues.push({
        path: [...ctx.path],
        feature: keyword,
        message: getFeatureMessage(keyword, ctx, `${keyword} is not supported`),
      });
    }
  }
}

function checkObjectConstraints(
  schema: JSONSchema,
  ctx: TraversalContext,
): void {
  if (
    schema.patternProperties &&
    isFeatureUnsupported('patternProperties', ctx)
  ) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'patternProperties',
      message: getFeatureMessage(
        'patternProperties',
        ctx,
        'patternProperties is not supported',
      ),
    });
  }

  if (schema.propertyNames && isFeatureUnsupported('propertyNames', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'propertyNames',
      message: getFeatureMessage(
        'propertyNames',
        ctx,
        'propertyNames is not supported',
      ),
    });
  }
}

function checkArrayConstraints(
  schema: JSONSchema,
  ctx: TraversalContext,
): void {
  if (schema.prefixItems && isFeatureUnsupported('prefixItems', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'prefixItems',
      message: getFeatureMessage(
        'prefixItems',
        ctx,
        'prefixItems is not supported',
      ),
    });
  }

  if (schema.contains && isFeatureUnsupported('contains', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'contains',
      message: getFeatureMessage('contains', ctx, 'contains is not supported'),
    });
  }

  if (schema.uniqueItems && isFeatureUnsupported('uniqueItems', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'uniqueItems',
      message: getFeatureMessage(
        'uniqueItems',
        ctx,
        'uniqueItems is not supported',
      ),
    });
  }

  if (schema.minItems !== undefined && isFeatureUnsupported('minItems', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'minItems',
      message: getFeatureMessage('minItems', ctx, 'minItems is not supported'),
    });
  }

  if (schema.maxItems !== undefined && isFeatureUnsupported('maxItems', ctx)) {
    ctx.issues.push({
      path: [...ctx.path],
      feature: 'maxItems',
      message: getFeatureMessage('maxItems', ctx, 'maxItems is not supported'),
    });
  }
}
