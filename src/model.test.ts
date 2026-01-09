import { describe, expect, test } from 'vitest';
import { parseModel } from './model.js';

describe('parseModel', () => {
  test('parses string format provider/model', () => {
    const result = parseModel('openai/gpt-4o');
    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4o');
  });

  test('parses string with slashes in model id', () => {
    const result = parseModel('huggingface/meta-llama/Llama-2-7b');
    expect(result.provider).toBe('huggingface');
    expect(result.modelId).toBe('meta-llama/Llama-2-7b');
  });

  test('parses object format', () => {
    const result = parseModel({ provider: 'OpenAI', modelId: 'gpt-4o' });
    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4o');
  });

  test('works with AI SDK model-like objects', () => {
    // Simulate AI SDK model object
    const aiSdkModel = {
      provider: 'openai.chat',
      modelId: 'gpt-4o-mini',
      specificationVersion: 'v2',
      doGenerate: () => {},
    };
    const result = parseModel(aiSdkModel);
    expect(result.provider).toBe('openai.chat');
    expect(result.modelId).toBe('gpt-4o-mini');
  });

  test('throws on invalid string format', () => {
    // @ts-expect-error - testing invalid input
    expect(() => parseModel('invalid')).toThrow('Expected format');
  });

  test('throws on empty parts', () => {
    expect(() => parseModel('/model')).toThrow('Both provider and model-id');
    expect(() => parseModel('provider/')).toThrow('Both provider and model-id');
  });
});
