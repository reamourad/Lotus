import { Card, BoosterData, Player } from '../types';
import { SCRYFALL_IMAGE_VERSION } from './constants';

/**
 * Generates a Scryfall URL that redirects to the high-resolution card image.
 */
export const getScryfallImageUrl = (cardName: string): string => {
  const encodedName = encodeURIComponent(cardName);
  return `https://api.scryfall.com/cards/named?exact=${encodedName}&format=image&version=${SCRYFALL_IMAGE_VERSION}`;
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
 * Helper function to fetch a pack and convert to Card objects
 */
export const fetchPackAsCards = async (currentSet: string): Promise<Card[]> => {
  const response = await fetch(`https://mtgdraftassistant.onrender.com/booster?set=${currentSet}`);
  if (!response.ok) {
    throw new Error(`Failed to load booster pack (HTTP status: ${response.status})`);
  }
  const data: BoosterData = await response.json();

  if (!data || !Array.isArray(data.pack)) {
    throw new Error("Invalid API response: 'pack' array is missing or malformed.");
  }

  // Fetch card data including mana cost from Scryfall - parallelize for speed
  const cardPromises = data.pack.map(async (cardName) => {
    try {
      const scryfallResponse = await fetch(
        `/api/scryfall?cardName=${encodeURIComponent(cardName)}&set=${data.set}`
      );
      if (scryfallResponse.ok) {
        const cardData = await scryfallResponse.json();
        return {
          name: cardName,
          imageUrl: getScryfallImageUrl(cardName),
          id: `${cardName}-${Date.now()}-${Math.random()}`,
          cmc: cardData.cmc || 0,
        };
      }
    } catch (error) {
      console.error(`Error fetching card data for ${cardName}:`, error);
    }
    return {
      name: cardName,
      imageUrl: getScryfallImageUrl(cardName),
      id: `${cardName}-${Date.now()}-${Math.random()}`,
      cmc: 0,
    };
  });

  const cardsWithData = await Promise.all(cardPromises);

  return cardsWithData;
};

/**
 * Bot makes a pick using the /predict endpoint
 */
export const makeBotPick = async (player: Player, currentSet: string): Promise<Card> => {
  try {
    const packCardNames = player.currentPack.map(c => c.name);
    const deckCardNames = player.picks.map(c => c.name);

    const response = await fetch('https://mtgdraftassistant.onrender.com/predict', {
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
