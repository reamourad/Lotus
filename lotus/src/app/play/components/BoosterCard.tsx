import React, { useRef } from 'react';
import { Card } from '../types';

interface BoosterCardProps {
  card: Card;
  isSelected: boolean;
  onCardClick: (card: Card) => void;
  onCardHover: (card: Card, rect: DOMRect) => void;
  onMouseLeave: () => void;
  isHoverEnabled: boolean;
  aiPrediction?: { rank: number; probability: number } | null;
}

// Individual Card Component
export const BoosterCard: React.FC<BoosterCardProps> = ({
  card,
  isSelected,
  onCardClick,
  onCardHover,
  onMouseLeave,
  isHoverEnabled,
  aiPrediction
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

  // Get glow color based on probability percentage - only at the top
  const getGlowStyle = () => {
    if (!aiPrediction) return {};

    const percentage = aiPrediction.probability * 100;
    let color;

    if (percentage < 10) {
      // Red for low probability (< 10%)
      color = 'rgba(239, 68, 68, 0.6)'; // Red
    } else if (percentage < 60) {
      // Yellow for medium probability (10-60%)
      color = 'rgba(234, 179, 8, 0.6)'; // Yellow
    } else {
      // Green for high probability (>= 60%)
      color = 'rgba(34, 197, 94, 0.6)'; // Green
    }

    return {
      boxShadow: `0 -15px 30px -5px ${color}, 0 -8px 15px -3px ${color}`,
    };
  };

  // Get badge color based on probability
  const getBadgeColor = () => {
    if (!aiPrediction) return '';
    const percentage = aiPrediction.probability * 100;

    if (percentage < 10) return 'border-red-500/50 bg-red-900/70';
    if (percentage < 60) return 'border-yellow-500/50 bg-yellow-900/70';
    return 'border-green-500/50 bg-green-900/70';
  };

  const getTextColor = () => {
    if (!aiPrediction) return '';
    const percentage = aiPrediction.probability * 100;

    if (percentage < 10) return 'text-red-300';
    if (percentage < 60) return 'text-yellow-300';
    return 'text-green-300';
  };

  // Combine glow and purple ring styles
  const getCombinedStyle = () => {
    const glowStyle = aiPrediction ? getGlowStyle() : {};

    if (isSelected) {
      // Add purple ring shadow if selected
      const purpleShadow = '0 0 0 4px rgba(147, 51, 234, 1)';
      const existingShadow = glowStyle.boxShadow;

      return {
        ...glowStyle,
        boxShadow: existingShadow
          ? `${existingShadow}, ${purpleShadow}`
          : purpleShadow
      };
    }

    return glowStyle;
  };

  return (
    <div
      ref={cardRef}
      className={`w-full h-auto cursor-pointer rounded-xl transition-transform transform duration-150 relative ${
        isSelected ? 'scale-[1.05]' : ''
      }`}
      onClick={() => onCardClick(card)}
      {...hoverProps}
      style={getCombinedStyle()}
    >
      {/* AI Prediction Overlay - show when ANY card is selected and this card has a prediction */}
      {aiPrediction && (
        <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 z-10 backdrop-blur-sm px-3 py-1 rounded-full border ${getBadgeColor()}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${getTextColor()}`}>#{aiPrediction.rank}</span>
            <span className="text-white text-xs font-mono">{(aiPrediction.probability * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

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
