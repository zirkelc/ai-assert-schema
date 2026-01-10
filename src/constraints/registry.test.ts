import { describe, expect, test } from 'vitest';
import { parseModel } from '../model.js';
import type { ModelIdentifier } from '../types.js';
import { openaiConstraints } from './providers/openai.js';
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

      const model = parseModel('my-custom-provider/v1');
      const constraints = providerRegistry.resolve(model);
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

      const model = parseModel('exact-provider/exact-model');
      const constraints = providerRegistry.resolve(model);
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

      const model = parseModel('priority-test/special-model');
      const constraints = providerRegistry.resolve(model);
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

      const model = parseModel('last-match-test/restricted-model');
      const constraints = providerRegistry.resolve(model);
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
      const model = parseModel('openai/gpt-4o');
      const constraints = providerRegistry.resolve(model);
      expect(constraints.modelId).toBe('gpt-4o');
      expect(constraints.provider).toBe('openai');
    });

    test('resolves constraints for model object', () => {
      const model = parseModel({ provider: 'openai', modelId: 'gpt-4o' });
      const constraints = providerRegistry.resolve(model);
      expect(constraints.modelId).toBe('gpt-4o');
      expect(constraints.provider).toBe('openai');
    });

    test('returns unknown provider for unregistered models', () => {
      const model = parseModel('unknown-provider/some-model');
      const constraints = providerRegistry.resolve(model);
      expect(constraints.provider).toBe('unknown');
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
      ])('resolves %s to openaiConstraints', (modelId) => {
        const model = parseModel(modelId);
        const constraints = providerRegistry.resolve(model);
        expect(constraints.provider).toBe(openaiConstraints.provider);
        expect(constraints.unsupported).toEqual(openaiConstraints.unsupported);
        expect(constraints.customValidators).toEqual(
          openaiConstraints.customValidators,
        );
      });
    });

    describe('Azure OpenAI patterns', () => {
      test.each<`${string}/${string}`>([
        'azure/openai-gpt-4',
        'azure/my-openai-deployment',
        'azure/gpt-4-openai',
        'azure.chat/openai-gpt-4o',
        'azure.chat/my-openai-model',
        'azure.responses/openai-deployment',
        'azure.responses/gpt-openai-4o',
      ])('resolves %s to openaiConstraints', (modelId) => {
        const model = parseModel(modelId);
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
      ])('does not resolve %s (no openai in model name)', (modelId) => {
        const model = parseModel(modelId);
        const constraints = providerRegistry.resolve(model);
        expect(constraints.provider).toBe('unknown');
      });
    });
  });
});
