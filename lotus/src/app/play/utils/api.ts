import { Card, BoosterData, Player } from '../types';
import { SCRYFALL_IMAGE_VERSION } from './constants';

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
 * Helper function to add delay between requests
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to fetch a pack and convert to Card objects
 * @param currentSet - The set code to fetch packs from
 * @param fetchDetails - Whether to fetch detailed card data (images, CMC) from Scryfall
 */
export const fetchPackAsCards = async (currentSet: string, fetchDetails: boolean = true): Promise<Card[]> => {
  const response = await fetch(`https://mtgdraftassistant.onrender.com/booster?set=${currentSet}`);
  if (!response.ok) {
    throw new Error(`Failed to load booster pack (HTTP status: ${response.status})`);
  }
  const data: BoosterData = await response.json();

  if (!data || !Array.isArray(data.pack)) {
    throw new Error("Invalid API response: 'pack' array is missing or malformed.");
  }

  // If we don't need details, just create basic card objects
  if (!fetchDetails) {
    return data.pack.map((cardName, index) => ({
      name: cardName,
      imageUrl: getScryfallImageUrl(cardName),
      id: `${cardName}-${Date.now()}-${index}`,
      cmc: 0,
      set_code: data.set,
      collector_number: undefined,
    }));
  }

  // Fetch card data sequentially with delays to respect rate limits
  const cards: Card[] = [];
  for (let i = 0; i < data.pack.length; i++) {
    const cardName = data.pack[i];

    try {
      const scryfallResponse = await fetch(
        `/api/scryfall?cardName=${encodeURIComponent(cardName)}&set=${data.set}`
      );

      if (scryfallResponse.ok) {
        const cardData = await scryfallResponse.json();

        // Use the image URI from Scryfall API response (CDN URLs, no CORS issues)
        // Handle both regular cards and double-faced cards
        let imageUrl: string | undefined;

        // Try to get the image from regular image_uris
        if (cardData.image_uris) {
          imageUrl = cardData.image_uris[SCRYFALL_IMAGE_VERSION] ||
                     cardData.image_uris.normal ||
                     cardData.image_uris.large ||
                     cardData.image_uris.small;
        }

        // For double-faced cards, use the front face image
        if (!imageUrl && cardData.card_faces && cardData.card_faces.length > 0) {
          const frontFace = cardData.card_faces[0];
          if (frontFace.image_uris) {
            imageUrl = frontFace.image_uris[SCRYFALL_IMAGE_VERSION] ||
                       frontFace.image_uris.normal ||
                       frontFace.image_uris.large ||
                       frontFace.image_uris.small;
          }
        }

        // Final fallback: use our proxy endpoint
        if (!imageUrl) {
          console.warn(`No CDN image URL found for ${cardName}, using proxy`);
          imageUrl = getScryfallImageUrl(cardName);
        }

        cards.push({
          name: cardName,
          imageUrl,
          id: `${cardName}-${Date.now()}-${i}`,
          cmc: cardData.cmc || 0,
          set_code: cardData.set || data.set,
          collector_number: cardData.collector_number,
        });
      } else {
        // API error, use fallback
        cards.push({
          name: cardName,
          imageUrl: getScryfallImageUrl(cardName),
          id: `${cardName}-${Date.now()}-${i}`,
          cmc: 0,
          set_code: data.set,
          collector_number: undefined,
        });
      }
    } catch (error) {
      console.error(`Error fetching card data for ${cardName}:`, error);
      // Fallback: use proxy endpoint
      cards.push({
        name: cardName,
        imageUrl: getScryfallImageUrl(cardName),
        id: `${cardName}-${Date.now()}-${i}`,
        cmc: 0,
        set_code: data.set,
        collector_number: undefined,
      });
    }

    // Small delay between requests (client-side throttling as additional safety)
    if (i < data.pack.length - 1) {
      await delay(50);
    }
  }

  return cards;
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
