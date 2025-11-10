import React from 'react';
import { Card } from '../types';
import { BoosterCard } from './BoosterCard';

interface BoosterGridProps {
  cards: Card[];
  selectedCardId: string | null;
  onCardClick: (card: Card) => void;
  onCardHover: (card: Card, rect: DOMRect) => void;
  onMouseLeave: () => void;
  isHoverEnabled: boolean;
  cardWidth: number;
  aiPredictions?: Array<{ card_name: string; probability: number }> | null;
}

// Main Grid Component now uses FLEXBOX for simple wrapping
export const BoosterGrid: React.FC<BoosterGridProps> = ({
  cards,
  selectedCardId,
  onCardClick,
  onCardHover,
  onMouseLeave,
  isHoverEnabled,
  cardWidth,
  aiPredictions
}) => {

  // Define the base props to be spread
  const baseCardProps = {
    onCardHover: onCardHover,
    onMouseLeave: onMouseLeave,
    isHoverEnabled,
  };

  // Create a map of card predictions by card name
  const predictionMap = new Map<string, { rank: number; probability: number }>();
  if (aiPredictions) {
    aiPredictions.forEach((pred, index) => {
      predictionMap.set(pred.card_name, {
        rank: index + 1,
        probability: pred.probability
      });
    });
  }

  return (
    // Outer container ensures centering and max width
    <div className="flex justify-start mx-auto">

      {/* Flexible container - larger default spacing for AI predictions */}
      <div className="flex flex-wrap justify-start p-6 md:p-8 gap-8">
        {cards.map(card => {
          const aiPrediction = predictionMap.get(card.name);
          return (
            <div
              key={card.id}
              style={{ width: `${cardWidth}px` }}
              className="flex-shrink-0"
            >
              <BoosterCard
                card={card}
                {...baseCardProps}
                isSelected={card.id === selectedCardId}
                onCardClick={onCardClick}
                aiPrediction={aiPrediction}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
