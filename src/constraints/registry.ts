import { parseModel } from '../model.js';
import type {
  BuiltInProvider,
  ModelIdentifier,
  ProviderConstraints,
  ProviderConstraintsEntry,
  ProviderPattern,
  ProviderRegistryEntry,
  ResolvedConstraints,
} from '../types.js';
import { anthropicConstraints } from './anthropic/anthropic.js';
import { googleConstraints } from './google/google.js';
import { openaiConstraints } from './openai/openai.js';

/**
 * Built-in provider constraints map
 */
const builtInProviders: Record<BuiltInProvider, ProviderConstraints> = {
  openai: openaiConstraints,
  anthropic: anthropicConstraints,
  google: googleConstraints,
};

/**
 * Registry for provider patterns and their constraints.
 *
 * Patterns can be:
 * - **Exact strings**: `'openai/gpt-4o'` - O(1) lookup, always takes precedence over regex
 * - **Regular expressions**: `/^openai\/.+$/` - Matched in order, last match wins
 *
 * When resolving a model, exact string matches are checked first. If no exact match
 * is found, regex patterns are tested in reverse registration order (last registered wins).
 */
export class ProviderRegistry {
  private registry = new Map<ProviderPattern, ProviderConstraints>();

  /**
   * Register a new provider pattern.
   *
   * @param entry - The pattern and constraints to register
   *
   * @example
   * ```ts
   * // Reference built-in provider by name
   * registry.register({
   *   pattern: /^azure\/.*openai.*$/,
   *   provider: 'openai',
   * });
   *
   * // Or provide custom constraints
   * registry.register({
   *   pattern: /^custom\/.+$/,
   *   constraints: customConstraints,
   * });
   * ```
   */
  register(entry: ProviderRegistryEntry): void {
    let constraints: ProviderConstraints;

    if ('provider' in entry) {
      const providerConstraints = builtInProviders[entry.provider];
      if (!providerConstraints) {
        throw new Error(
          `Unknown provider "${entry.provider}". Available providers: ${Object.keys(builtInProviders).join(', ')}`,
        );
      }
      constraints = providerConstraints;
    } else {
      constraints = entry.constraints;
    }

    this.registry.set(entry.pattern, constraints);
  }

  /**
   * Resolve constraints for a model.
   *
   * Matching order:
   * 1. Exact string match (always wins)
   * 2. Regex patterns (last match wins)
   *
   * @param model - Model identifier as `'provider/model-id'` string or `{ provider, modelId }` object
   * @returns Resolved constraints for the model
   *
   * @example
   * ```ts
   * // String format
   * const constraints = registry.resolve('openai/gpt-4o');
   *
   * // Object format
   * const constraints = registry.resolve({ provider: 'openai', modelId: 'gpt-4o' });
   * ```
   */
  resolve(model: ModelIdentifier): ResolvedConstraints {
    const parsedModel = parseModel(model);
    const modelIdentifier = `${parsedModel.provider}/${parsedModel.modelId}`;

    // Try exact string match first
    const exactMatch = this.registry.get(modelIdentifier);
    if (exactMatch) {
      return {
        provider: exactMatch.provider,
        modelId: parsedModel.modelId,
        unsupported: exactMatch.unsupported,
        customValidators: exactMatch.customValidators ?? [],
        jsonSchemaTarget: exactMatch.jsonSchemaTarget,
      };
    }

    // Search regex patterns in reverse - last match wins (most recently registered)
    const entries = Array.from(this.registry.entries()).reverse();
    for (const [pattern, constraints] of entries) {
      if (pattern instanceof RegExp && pattern.test(modelIdentifier)) {
        return {
          provider: constraints.provider,
          modelId: parsedModel.modelId,
          unsupported: constraints.unsupported,
          customValidators: constraints.customValidators ?? [],
          jsonSchemaTarget: constraints.jsonSchemaTarget,
        };
      }
    }

    // No match - return permissive defaults with warning
    console.warn(
      `[ai-assert-schema] Unknown model "${modelIdentifier}" - no constraints applied.`,
    );

    return {
      provider: parsedModel.provider,
      modelId: parsedModel.modelId,
      unsupported: [],
      customValidators: [],
    };
  }

  /**
   * Get all registered patterns with their resolved constraints
   */
  getAll(): ProviderConstraintsEntry[] {
    return Array.from(this.registry.entries()).map(
      ([pattern, constraints]) => ({
        pattern,
        constraints,
      }),
    );
  }
}

/**
 * Singleton instance of the provider registry
 */
export const providerRegistry = new ProviderRegistry();

/**
 * OpenAI
 * Matches:
 *  - openai/*
 *  - openai.chat/*
 *  - openai.responses/*
 */
providerRegistry.register({
  pattern: /^(openai|openai\.chat|openai\.responses)\/.+$/,
  provider: 'openai',
});

/**
 * Azure OpenAI
 * Matches:
 *  - azure/*openai*
 *  - azure.chat/*openai*
 *  - azure.responses/*openai*
 */
providerRegistry.register({
  pattern: /^(azure|azure\.chat|azure\.responses)\/.*openai.*$/,
  provider: 'openai',
});

/**
 * Anthropic
 * Matches:
 *  - anthropic/*
 *  - anthropic.messages/*
 */
providerRegistry.register({
  pattern: /^(anthropic|anthropic\.messages)\/.+$/,
  provider: 'anthropic',
});

/**
 * Google
 * Matches:
 *  - google.generative-ai/*
 *  - google.vertex.chat/*
 *  - google.vertex/*
 */
providerRegistry.register({
  pattern: /^(google\.generative-ai|google\.vertex\.chat|google\.vertex)\/.+$/,
  provider: 'google',
});
