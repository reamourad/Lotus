import React, { useRef } from 'react';
import { Card } from '../types';

interface BoosterCardProps {
  card: Card;
  isSelected: boolean;
  onCardClick: (card: Card) => void;
  onCardHover: (card: Card, rect: DOMRect) => void;
  onMouseLeave: () => void;
  isHoverEnabled: boolean;
}

// Individual Card Component
export const BoosterCard: React.FC<BoosterCardProps> = ({
  card,
  isSelected,
  onCardClick,
  onCardHover,
  onMouseLeave,
  isHoverEnabled
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackImageUrl = `https://placehold.co/180x252/374151/FFFFFF?text=${encodeURIComponent(card.name)}`;

  const handleMouseEnter = () => {
    if (isHoverEnabled && cardRef.current) {
        onCardHover(card, cardRef.current.getBoundingClientRect());
    }
  };

  const hoverProps = isHoverEnabled
    ? { onMouseEnter: handleMouseEnter, onMouseLeave }
    : {};

  return (
    <div
      ref={cardRef}
      className={`w-full h-auto cursor-pointer p-0.5 rounded-xl transition-transform transform duration-150 ${
        isSelected ? 'scale-[1.05] ring-4 ring-purple-600 shadow-purple-500/50' : ''
      }`}
      onClick={() => onCardClick(card)}
      {...hoverProps}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="w-full h-auto rounded-xl shadow-lg aspect-[2.5/3.5] object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallbackImageUrl;
          (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop
        }}
      />
    </div>
  );
};
