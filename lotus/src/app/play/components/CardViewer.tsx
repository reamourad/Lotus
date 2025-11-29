import React, { useEffect, useState } from 'react';
import { Card } from '../types';

// A more detailed interface for Scryfall card data
interface ScryfallCard {
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text: string;
  power?: string;
  toughness?: string;
  flavor_text?: string;
}

interface CardViewerProps {
  card: Card;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export const CardViewer: React.FC<CardViewerProps> = ({
  card,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}) => {
  const [scryfallData, setScryfallData] = useState<ScryfallCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch detailed card data from our API endpoint
  useEffect(() => {
    const fetchCardData = async () => {
      if (!card) return;

      setLoading(true);
      setError(null);
      setScryfallData(null);

      try {
        const response = await fetch(`/api/scryfall?cardName=${encodeURIComponent(card.name)}&set=${card.set_code || ''}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch card data (${response.status})`);
        }
        const data = await response.json();
        setScryfallData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [card]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && canGoPrevious) onPrevious();
      else if (e.key === 'ArrowRight' && canGoNext) onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext, canGoPrevious, canGoNext]);

  // Sanitize and format oracle text with mana symbols
  const formatOracleText = (text: string) => {
    const sanitized = text.replace(/\{(\w+)\}/g, (match, symbol) => {
      return `<img src="https://c2.scryfall.com/file/scryfall-symbols/card-symbols/${symbol}.svg" alt="${symbol}" class="inline-block h-4 w-4 mx-0.5" />`;
    });
    return sanitized.replace(/\n/g, '<br />');
  };
  
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="relative flex items-center gap-8 max-w-6xl w-full" onClick={e => e.stopPropagation()}>

        {/* Previous Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onPrevious(); }}
          disabled={!canGoPrevious}
          className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all bg-white/10 hover:bg-white/20 text-white disabled:opacity-0"
          aria-label="Previous card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
          <div className="flex justify-center items-center h-full animate-fade-in">
            <img
              src={card.imageUrl}
              alt={card.name}
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl shadow-black/50"
            />
          </div>

          <div className="flex flex-col text-white animate-fade-in-slow space-y-4 pr-4 md:pr-8 max-h-[85vh] overflow-y-auto">
            {loading && <div className="text-center text-gray-400">Loading details...</div>}
            {error && <div className="text-center text-red-400">{error}</div>}
            {scryfallData && (
              <>
                <div className="flex justify-between items-start gap-4">
                  <h1 className="text-3xl font-bold">{scryfallData.name}</h1>
                  <p className="text-2xl font-semibold whitespace-nowrap" dangerouslySetInnerHTML={{ __html: formatOracleText(scryfallData.mana_cost) }} />
                </div>
                <p className="text-xl italic pb-2 border-b border-gray-700">{scryfallData.type_line}</p>
                <div className="text-lg space-y-3" dangerouslySetInnerHTML={{ __html: formatOracleText(scryfallData.oracle_text) }} />
                {scryfallData.power && scryfallData.toughness && (
                  <p className="text-2xl font-bold self-end pt-2 mt-auto">{scryfallData.power}/{scryfallData.toughness}</p>
                )}
                {scryfallData.flavor_text && (
                  <p className="text-md italic border-t border-gray-700 pt-4 mt-4 text-gray-400">{scryfallData.flavor_text}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          disabled={!canGoNext}
          className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all bg-white/10 hover:bg-white/20 text-white disabled:opacity-0"
          aria-label="Next card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm animate-fade-in">
        Use arrow keys to navigate • ESC to close
      </div>
    </div>
  );
};
