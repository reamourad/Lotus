'use client';

import { useState } from 'react';
import Header from "@/components/Header";

interface BoosterResponse {
  pack: string[];
  set: string;
  count: number;
}

interface ScryfallCard {
  name: string;
  image_uris?: {
    normal: string;
    small: string;
  };
  card_faces?: Array<{
    image_uris: {
      normal: string;
      small: string;
    };
  }>;
}

export default function Home() {
  const [booster, setBooster] = useState<BoosterResponse | null>(null);
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState('mh3');

  const fetchBooster = async () => {
    setLoading(true);
    setCards([]);

    try {
      // Fetch booster from your endpoint
      const response = await fetch(`https://mtgdraftassistant.onrender.com/booster?set=${selectedSet}`);
      const data: BoosterResponse = await response.json();
      setBooster(data);

      // Fetch card images from Scryfall in parallel for better performance
      const cardPromises = data.pack.map(async (cardName) => {
        try {
          // Use our API route to avoid CORS issues
          const scryfallResponse = await fetch(
            `/api/scryfall?cardName=${encodeURIComponent(cardName)}&set=${data.set.toLowerCase()}`
          );

          if (scryfallResponse.ok) {
            return await scryfallResponse.json();
          } else {
            console.error(`Failed to fetch ${cardName}:`, scryfallResponse.status);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching ${cardName}:`, error);
          return null;
        }
      });

      const cardResults = await Promise.all(cardPromises);
      const cardData = cardResults.filter((card): card is ScryfallCard => card !== null);

      setCards(cardData);
    } catch (error) {
      console.error('Error fetching booster:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardImage = (card: ScryfallCard) => {
    if (card.image_uris) {
      return card.image_uris.normal;
    }
    if (card.card_faces && card.card_faces[0]) {
      return card.card_faces[0].image_uris.normal;
    }
    return '';
  };

  return (
    <>
      <Header activeTab="home" />
      <main className="min-h-screen bg-lotus-bg">
        <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6 mb-8">
          <h1 className="text-4xl font-bold text-white">MTG Booster Pack</h1>

          <div className="flex gap-4 items-center">
            <input
              type="text"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value.toLowerCase())}
              placeholder="Set code (e.g., mh3)"
              className="px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={fetchBooster}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold transition-colors"
            >
              {loading ? 'Opening...' : 'Open Booster'}
            </button>
          </div>

          {booster && (
            <p className="text-gray-300">
              {booster.count} cards from {booster.set.toUpperCase()}
            </p>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-white text-xl">Loading cards...</div>
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((card, index) => (
              <div
                key={index}
                className="transform hover:scale-105 transition-transform duration-200 cursor-pointer"
              >
                <img
                  src={getCardImage(card)}
                  alt={card.name}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            ))}
          </div>
        )}

        {!loading && !booster && (
          <div className="flex items-center justify-center py-20">
            <img
              src="/gradient.png"
              alt="Logo overlay"
              className="w-full h-[60vh] object-fill"
            />
          </div>
        )}
        </div>
      </main>
    </>
  );
}