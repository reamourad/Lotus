import { Card, BoosterData, Player } from '../types';
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
 * Bot makes a pick using the /predict endpoint
 */
export const makeBotPick = async (player: Player, currentSet: string): Promise<Card> => {
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
