import type {
  ParsedModel,
  ProviderConstraints,
  ProviderPattern,
  ProviderRegistryEntry,
  ResolvedConstraints,
} from '../types.js';
import { openaiConstraints } from './providers/openai.js';

/**
 * Registry for provider patterns and their constraints
 */
export class ProviderRegistry {
  private registry = new Map<ProviderPattern, ProviderConstraints>();

  /**
   * Register a new provider pattern
   *
   * - String patterns: exact match (O(1) lookup, always wins over regex)
   * - RegExp patterns: last match wins (register specific patterns after general ones)
   */
  register(entry: ProviderRegistryEntry): void {
    this.registry.set(entry.pattern, entry.constraints);
  }

  /**
   * Resolve constraints for a parsed model
   *
   * Matching order:
   * 1. Exact string match (always wins)
   * 2. Regex patterns (last match wins)
   *
   * @param model - Parsed model from parseModel()
   */
  resolve(model: ParsedModel): ResolvedConstraints {
    const modelIdentifier = `${model.provider}/${model.modelId}`;

    // Try exact string match first
    const exactMatch = this.registry.get(modelIdentifier);
    if (exactMatch) {
      return {
        provider: exactMatch.provider,
        modelId: model.modelId,
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
          modelId: model.modelId,
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
      provider: 'unknown',
      modelId: model.modelId,
      unsupported: [],
      customValidators: [],
    };
  }

  /**
   * Get all registered patterns
   */
  getAll(): ProviderRegistryEntry[] {
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
  constraints: openaiConstraints,
});

// TODO consider adding patterns like azure/*gpt*, etc.

/**
 * Azure OpenAI
 * Matches:
 *  - azure/*openai*
 *  - azure.chat/*openai*
 *  - azure.responses/*openai*
 */
providerRegistry.register({
  pattern: /^(azure|azure\.chat|azure\.responses)\/.*openai.*$/,
  constraints: openaiConstraints,
});
