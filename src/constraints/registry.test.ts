import { describe, expect, test } from 'vitest';
import type { ModelIdentifier } from '../types.js';
import { openaiConstraints } from './openai/openai.js';
import { providerRegistry } from './registry.js';

describe('ProviderRegistry', () => {
  describe('register', () => {
    test('registers custom provider with regex pattern', () => {
      providerRegistry.register({
        pattern: /^my-custom-provider\/.+$/,
        constraints: {
          provider: 'my-custom-provider',
          unsupported: [{ feature: 'anyOf', message: 'anyOf not allowed' }],
        },
      });

      const constraints = providerRegistry.resolve('my-custom-provider/v1');
      expect(constraints.provider).toBe('my-custom-provider');
      expect(constraints.unsupported).toHaveLength(1);
      expect(constraints.unsupported[0]?.feature).toBe('anyOf');
    });

    test('registers exact match pattern', () => {
      providerRegistry.register({
        pattern: 'exact-provider/exact-model',
        constraints: {
          provider: 'exact-provider',
          unsupported: [{ feature: 'oneOf', message: 'oneOf not allowed' }],
        },
      });

      const constraints = providerRegistry.resolve(
        'exact-provider/exact-model',
      );
      expect(constraints.provider).toBe('exact-provider');
      expect(constraints.unsupported[0]?.feature).toBe('oneOf');
    });

    test('exact match takes priority over regex', () => {
      // Register regex pattern that would match
      providerRegistry.register({
        pattern: /^priority-test\/.+$/,
        constraints: {
          provider: 'priority-test-regex',
          unsupported: [{ feature: 'anyOf', message: 'anyOf not allowed' }],
        },
      });

      // Register exact match - should win
      providerRegistry.register({
        pattern: 'priority-test/special-model',
        constraints: {
          provider: 'priority-test-exact',
          unsupported: [],
        },
      });

      const constraints = providerRegistry.resolve(
        'priority-test/special-model',
      );
      // Exact match should win
      expect(constraints.provider).toBe('priority-test-exact');
      expect(constraints.unsupported).toEqual([]);
    });

    test('last regex match wins', () => {
      // Register general pattern first
      providerRegistry.register({
        pattern: /^last-match-test\/.+$/,
        constraints: {
          provider: 'last-match-general',
          unsupported: [],
        },
      });

      // Register more specific pattern later - should win
      providerRegistry.register({
        pattern: /^last-match-test\/restricted-.+$/,
        constraints: {
          provider: 'last-match-specific',
          unsupported: [{ feature: 'oneOf', message: 'oneOf not allowed' }],
        },
      });

      const constraints = providerRegistry.resolve(
        'last-match-test/restricted-model',
      );
      // Last matching pattern should win
      expect(constraints.provider).toBe('last-match-specific');
      expect(constraints.unsupported).toHaveLength(1);
    });
  });

  describe('getAll', () => {
    test('returns all registered providers', () => {
      const providers = providerRegistry.getAll();
      expect(providers.length).toBeGreaterThan(0);
    });

    test('includes built-in OpenAI provider', () => {
      const providers = providerRegistry.getAll();
      const hasOpenAI = providers.some(
        (p) => p.pattern instanceof RegExp && p.pattern.test('openai/gpt-4o'),
      );
      expect(hasOpenAI).toBe(true);
    });
  });

  describe('resolve', () => {
    test('resolves constraints for string model identifier', () => {
      const constraints = providerRegistry.resolve('openai/gpt-4o');
      expect(constraints.modelId).toBe('gpt-4o');
      expect(constraints.provider).toBe('openai');
    });

    test('resolves constraints for model object', () => {
      const constraints = providerRegistry.resolve({
        provider: 'openai',
        modelId: 'gpt-4o',
      });
      expect(constraints.modelId).toBe('gpt-4o');
      expect(constraints.provider).toBe('openai');
    });

    test('returns unknown provider for unregistered models', () => {
      const constraints = providerRegistry.resolve(
        'unknown-provider/some-model',
      );
      expect(constraints.provider).toBe('unknown-provider');
      expect(constraints.unsupported).toEqual([]);
    });

    describe('OpenAI patterns', () => {
      test.each<ModelIdentifier>([
        'openai/gpt-5',
        'openai/gpt-4o',
        'openai.chat/gpt-4o',
        'openai.chat/gpt-4o-mini',
        'openai.responses/gpt-4o',
        'openai.responses/gpt-4o-mini',
      ])('resolves %s to openaiConstraints', (model) => {
        const constraints = providerRegistry.resolve(model);
        expect(constraints.provider).toBe(openaiConstraints.provider);
        expect(constraints.unsupported).toEqual(openaiConstraints.unsupported);
        expect(constraints.customValidators).toEqual(
          openaiConstraints.customValidators,
        );
      });
    });

    describe('Azure OpenAI patterns', () => {
      test.each<ModelIdentifier>([
        'azure/openai-gpt-4',
        'azure/my-openai-deployment',
        'azure/gpt-4-openai',
        'azure.chat/openai-gpt-4o',
        'azure.chat/my-openai-model',
        'azure.responses/openai-deployment',
        'azure.responses/gpt-openai-4o',
      ])('resolves %s to openaiConstraints', (model) => {
        const constraints = providerRegistry.resolve(model);
        expect(constraints.provider).toBe(openaiConstraints.provider);
        expect(constraints.unsupported).toEqual(openaiConstraints.unsupported);
        expect(constraints.customValidators).toEqual(
          openaiConstraints.customValidators,
        );
      });

      test.each<ModelIdentifier>([
        'azure/some-other-model',
        'azure/gpt-4-deployment',
        'azure.chat/mistral-model',
        'azure.responses/llama-deployment',
      ])('does not resolve %s (no openai in model name)', (model) => {
        const constraints = providerRegistry.resolve(model);
        // Returns parsed provider name when no match found
        const [provider, modelId] = (model as string).split('/');
        expect(constraints.provider).toBe(provider);
        expect(constraints.modelId).toBe(modelId);
        expect(constraints.unsupported).toEqual([]);
      });
    });
  });
});
