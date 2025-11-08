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

  // Fetch card data including mana cost from Scryfall
  const cardsWithData: Card[] = [];
  for (const cardName of data.pack) {
    try {
      const scryfallResponse = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
      );
      if (scryfallResponse.ok) {
        const cardData = await scryfallResponse.json();
        cardsWithData.push({
          name: cardName,
          imageUrl: getScryfallImageUrl(cardName),
          id: `${cardName}-${cardsWithData.length}-${Date.now()}-${Math.random()}`,
          cmc: cardData.cmc || 0,
        });
      }
    } catch (error) {
      console.error(`Error fetching card data for ${cardName}:`, error);
      cardsWithData.push({
        name: cardName,
        imageUrl: getScryfallImageUrl(cardName),
        id: `${cardName}-${cardsWithData.length}-${Date.now()}-${Math.random()}`,
        cmc: 0,
      });
    }
  }

  return cardsWithData;
};

/**
 * Bot makes a pick using the /predict endpoint
 */
export const makeBotPick = async (player: Player, currentSet: string): Promise<Card> => {
  try {
    const packCardNames = player.currentPack.map(c => c.name);
    const deckCardNames = player.picks.map(c => c.name);

    console.log('Making bot pick for player', player.id, {
      pack: packCardNames,
      deck: deckCardNames,
      set: currentSet
    });

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
      const errorText = await response.text();
      console.warn('Bot prediction failed:', response.status, errorText);
      console.warn('Falling back to random pick');
      // Fallback: pick random card
      return player.currentPack[Math.floor(Math.random() * player.currentPack.length)];
    }

    const data = await response.json();
    console.log('Bot prediction response:', data);

    // Try different possible response formats
    const predictedCardName = data.prediction || data.card || data.pick || data.choice;

    // Find the card in the pack
    const pickedCard = player.currentPack.find(c => c.name === predictedCardName);
    if (pickedCard) {
      console.log('Bot picked:', predictedCardName);
      return pickedCard;
    }

    console.warn('Predicted card not found in pack, using fallback');
    // Fallback: pick the first card if prediction not found
    return player.currentPack[0];
  } catch (error) {
    console.error('Bot pick error:', error);
    // Fallback: pick random card
    return player.currentPack[Math.floor(Math.random() * player.currentPack.length)];
  }
};
