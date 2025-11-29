'use client';

import React, { useState } from 'react';
import { Card } from '../types';
import { BoosterCard } from './BoosterCard'; // Assuming we can reuse BoosterCard

interface DraftResultsProps {
  draftedCards: Card[];
  onRestartDraft: () => void;
}

export const DraftResults: React.FC<DraftResultsProps> = ({ draftedCards, onRestartDraft }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  // Format cards in Arena format: {count} {card_name} ({set_code}) {collector_number}
  const formatForArena = () => {
    // Count cards by name
    const cardCounts = new Map<string, { card: Card; count: number }>();

    draftedCards.forEach((card) => {
      const existing = cardCounts.get(card.name);
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(card.name, { card, count: 1 });
      }
    });

    // Format each card
    const lines: string[] = [];
    cardCounts.forEach(({ card, count }) => {
      // Extract set code from card data (you may need to adjust based on your Card type)
      const setCode = card.set_code || 'SET'; // Fallback to 'SET' if not available
      const collectorNumber = card.collector_number || '1'; // Fallback if not available
      lines.push(`${count} ${card.name} (${setCode.toUpperCase()}) ${collectorNumber}`);
    });

    return lines.join('\n');
  };

  const handleCopyToClipboard = async () => {
    const arenaFormat = formatForArena();
    try {
      await navigator.clipboard.writeText(arenaFormat);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h2 className="text-4xl font-bold text-white mb-8">Draft Completed!</h2>
      <p className="text-xl text-gray-300 mb-6">Here are all your picks:</p>

      {/* Copy to Clipboard Button */}
      <button
        onClick={handleCopyToClipboard}
        className="mb-12 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {copySuccess ? 'Copied!' : 'Copy to Clipboard (Arena Format)'}
      </button>

      {/* Drafted Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 max-w-7xl">
        {draftedCards.map((card) => (
          <div key={card.id} style={{ width: '150px' }}>
            <BoosterCard
              card={card}
              onCardClick={() => {}} // No click action for results
              onCardHover={() => {}} // No hover for results
              onMouseLeave={() => {}}
              isSelected={false}
              isHoverEnabled={false}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onRestartDraft}
        className="mt-12 px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-purple-700 transition duration-300 ease-in-out"
      >
        Start New Draft
      </button>
    </div>
  );
};