import { Card, BoosterData, ModelInfo, Player } from '../types';
import { SCRYFALL_IMAGE_VERSION, API_BASE_URL } from './constants';

/**
 * Generates a URL to our proxy that fetches the card image from Scryfall.
 * This avoids CORS issues by proxying the request through our API.
 */
export const getScryfallImageUrl = (cardName: string): string => {
  const encodedName = encodeURIComponent(cardName);
  return `/api/card-image?cardName=${encodedName}&version=${SCRYFALL_IMAGE_VERSION}`;
};

/**
 * Helper function to preload images
 */
export const preloadImages = (cards: Card[]): Promise<void> => {
  return new Promise((resolve) => {
    const imagePromises = cards.map((card) => {
      return new Promise<void>((resolveImg) => {
        const img = new Image();
        img.onload = () => resolveImg();
        img.onerror = () => resolveImg(); // Resolve even on error to not block
        img.src = card.imageUrl;
      });
    });

    Promise.all(imagePromises).then(() => resolve());
  });
};

/**
 * Helper function to fetch a pack and convert to Card objects.
 *
 * The backend's /booster response already includes each card's mana cost,
 * CMC, type, rarity, etc. (sourced from MTGJSON), so no per-card Scryfall
 * lookup is needed just to know which "box" a card belongs in. Only the
 * card art still comes from Scryfall, via the lazy-loaded image proxy URL.
 * @param currentSet - The set code to fetch packs from
 */
export const fetchPackAsCards = async (currentSet: string): Promise<Card[]> => {
  const response = await fetch(`${API_BASE_URL}/booster?set=${currentSet}`);
  if (!response.ok) {
    throw new Error(`Failed to load booster pack (HTTP status: ${response.status})`);
  }
  const data: BoosterData = await response.json();

  if (!data || !Array.isArray(data.pack)) {
    throw new Error("Invalid API response: 'pack' array is missing or malformed.");
  }

  return data.pack.map((card, index) => ({
    name: card.name,
    imageUrl: getScryfallImageUrl(card.name),
    id: `${card.name}-${Date.now()}-${index}`,
    cmc: card.cmc || 0,
    set_code: data.set,
    collector_number: undefined,
    mana_cost: card.mana_cost,
    types: card.types,
    subtypes: card.subtypes,
    rarity: card.rarity,
    power: card.power,
    toughness: card.toughness,
    oracle_text: card.oracle_text,
  }));
};

/**
 * Fetches every trained model the backend can serve. Goes through our own
 * proxy route so the browser never has to reach the Modal host directly.
 */
const heldOutScore = (model: ModelInfo): number =>
  model.metrics?.holdout?.top_1_accuracy ?? model.metrics?.fold?.top_1_accuracy ?? -1;

/**
 * One entry per training run, keeping that run's best-scoring fold. A run's
 * folds differ only by which slice of drafts they trained on, so listing all
 * of them just gives the reader several near-identical choices. Older models
 * with no recorded metrics are dropped once any measured model exists.
 */
const pickOnePerRun = (models: ModelInfo[]): ModelInfo[] => {
  const bestByRun = new Map<string, ModelInfo>();
  models.forEach((model) => {
    const runId = model.model_id.split('/')[0];
    const incumbent = bestByRun.get(runId);
    if (!incumbent || heldOutScore(model) > heldOutScore(incumbent)) {
      bestByRun.set(runId, model);
    }
  });
  const chosen = Array.from(bestByRun.values());
  const measured = chosen.filter((m) => heldOutScore(m) >= 0);
  return (measured.length > 0 ? measured : chosen).sort((a, b) => heldOutScore(b) - heldOutScore(a));
};

/**
 * The strongest model of each architecture version, oldest version first.
 * The comparison page wants exactly one v1, one v2 and one v3, no matter how
 * many runs or folds of each happen to be loaded.
 */
export const bestPerVersion = (models: ModelInfo[]): ModelInfo[] => {
  const best = new Map<string, ModelInfo>();
  models.forEach((model) => {
    const incumbent = best.get(model.version);
    if (!incumbent || heldOutScore(model) > heldOutScore(incumbent)) {
      best.set(model.version, model);
    }
  });
  return Array.from(best.values()).sort((a, b) => a.version.localeCompare(b.version));
};

/**
 * Asks one model to rank a pack. Returns the predictions already sorted by
 * the backend, strongest pick first.
 */
export const fetchPredictions = async (
  setCode: string,
  pack: string[],
  deck: string[],
  modelId: string,
  signal?: AbortSignal,
): Promise<Array<{ card_name: string; probability: number }>> => {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ set: setCode, pack, deck, model: modelId }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Prediction failed for ${modelId} (HTTP status: ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data.predictions) ? data.predictions : [];
};

export const fetchModels = async (): Promise<{ models: ModelInfo[]; defaultModelId: string | null }> => {
  const response = await fetch('/api/models', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load models (HTTP status: ${response.status})`);
  }
  const data = await response.json();
  const loaded: ModelInfo[] = Array.isArray(data.models) ? data.models.filter((m: ModelInfo) => m.loaded) : [];
  const models = pickOnePerRun(loaded);
  const backendDefault: string | null = data.default_model_id ?? null;
  const defaultModelId = models.some((m) => m.model_id === backendDefault)
    ? backendDefault
    : (models[0]?.model_id ?? null);
  return { models, defaultModelId };
};

/**
 * Short human-readable label for a model, e.g. "v3 graph — 40.9% on an unseen set".
 */
export const modelLabel = (model: ModelInfo): string => {
  const name = model.version.replace(/_/g, ' ');
  const holdout = model.metrics?.holdout?.top_1_accuracy;
  const fold = model.metrics?.fold?.top_1_accuracy;
  if (typeof holdout === 'number') {
    return `${name} — ${(holdout * 100).toFixed(1)}% on an unseen set`;
  }
  if (typeof fold === 'number') {
    return `${name} — ${(fold * 100).toFixed(1)}% top pick`;
  }
  return name;
};

/**
 * Bot makes a pick using the /predict endpoint
 */
export const makeBotPick = async (player: Player, currentSet: string, modelId?: string | null): Promise<Card> => {
  try {
    const packCardNames = player.currentPack.map(c => c.name);
    const deckCardNames = player.picks.map(c => c.name);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pack: packCardNames,
        deck: deckCardNames,
        set: currentSet,
        ...(modelId ? { model: modelId } : {}),
      }),
    });

    if (!response.ok) {
      console.warn('Bot prediction failed, using random pick');
      return player.currentPack[Math.floor(Math.random() * player.currentPack.length)];
    }

    const data = await response.json();

    // Handle the predictions array format from the API
    let predictedCardName: string | undefined;

    if (data.predictions && Array.isArray(data.predictions) && data.predictions.length > 0) {
      // Get the highest probability prediction (first in array)
      predictedCardName = data.predictions[0].card_name;
    } else {
      // Fallback to old format just in case
      predictedCardName = data.prediction || data.card || data.pick || data.choice;
    }

    // Find the card in the pack
    const pickedCard = player.currentPack.find(c => c.name === predictedCardName);
    if (pickedCard) {
      return pickedCard;
    }

    console.warn('AI predicted card not found in pack, using fallback');
    // Fallback: pick the first card if prediction not found
    return player.currentPack[0];
  } catch (error) {
    console.error('Bot pick error:', error);
    // Fallback: pick random card
    return player.currentPack[Math.floor(Math.random() * player.currentPack.length)];
  }
};
