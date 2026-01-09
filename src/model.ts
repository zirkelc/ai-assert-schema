import type {
  ModelIdentifier,
  ModelObject,
  ModelString,
  ParsedModel,
} from './types.js';

/**
 * Check if the model is an object with provider and modelId properties
 */
function isModelObject(model: ModelIdentifier): model is ModelObject {
  return (
    typeof model === 'object' &&
    model !== null &&
    'provider' in model &&
    'modelId' in model &&
    typeof model.provider === 'string' &&
    typeof model.modelId === 'string'
  );
}

/**
 * Parse model identifier into normalized form
 */
export function parseModel(model: ModelIdentifier): ParsedModel {
  if (typeof model === 'string') {
    return parseModelString(model);
  }

  if (isModelObject(model)) {
    return parseModelObject(model);
  }

  throw new Error(
    'Invalid model identifier. Expected "provider/model-id" string or { provider: string, modelId: string } object',
  );
}

function parseModelString(model: string): ParsedModel {
  const slashIndex = model.indexOf('/');

  if (slashIndex === -1) {
    throw new Error(
      `Invalid model identifier: "${model}". Expected format: "provider/model-id" (e.g., "openai/gpt-4o")`,
    );
  }

  const provider = model.slice(0, slashIndex);
  const modelId = model.slice(slashIndex + 1);

  if (!provider || !modelId) {
    throw new Error(
      `Invalid model identifier: "${model}". Both provider and model-id are required.`,
    );
  }

  return {
    provider: provider.toLowerCase(),
    modelId,
    original: model as ModelString,
  };
}

function parseModelObject(model: ModelObject): ParsedModel {
  if (!model.provider || !model.modelId) {
    throw new Error(
      'Invalid model identifier object. Both provider and modelId are required.',
    );
  }

  return {
    provider: model.provider.toLowerCase(),
    modelId: model.modelId,
    original: model,
  };
}
