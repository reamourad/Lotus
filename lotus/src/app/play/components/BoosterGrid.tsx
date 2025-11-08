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
}

// Main Grid Component now uses FLEXBOX for simple wrapping
export const BoosterGrid: React.FC<BoosterGridProps> = ({
  cards,
  selectedCardId,
  onCardClick,
  onCardHover,
  onMouseLeave,
  isHoverEnabled,
  cardWidth
}) => {

  // Define the base props to be spread
  const baseCardProps = {
    onCardHover: onCardHover,
    onMouseLeave: onMouseLeave,
    isHoverEnabled,
  };

  return (
    // Outer container ensures centering and max width
    <div className="flex justify-start mx-auto">

      {/* Flexible container */}
      <div className="flex flex-wrap justify-start gap-4 p-6 md:p-8">
        {cards.map(card => (
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
            />
          </div>
        ))}
      </div>
    </div>
  );
};
