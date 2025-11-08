import React from 'react';
import { Card, HoverPosition } from '../types';
import { CARD_ASPECT_RATIO } from '../utils/constants';

interface CardHoverPreviewProps {
  card: Card | null;
  cardPosition: HoverPosition | null;
}

// Card Hover Preview Component (The "Zoom" Effect)
export const CardHoverPreview: React.FC<CardHoverPreviewProps> = ({ card, cardPosition }) => {
  if (!card || !cardPosition) return null;

  const PREVIEW_WIDTH = 300; // Fixed width for the large preview card
  const PREVIEW_HEIGHT = PREVIEW_WIDTH / CARD_ASPECT_RATIO;
  const WINDOW_PADDING = 20;

  let left = cardPosition.x + cardPosition.width + 10;
  let top = cardPosition.y + cardPosition.height / 2 - PREVIEW_HEIGHT / 2;

  // 1. Ensure the card is within the right edge of the viewport
  if (left + PREVIEW_WIDTH + WINDOW_PADDING > window.innerWidth) {
    // If it hits the right edge, place it to the left of the hovered card
    left = cardPosition.x - PREVIEW_WIDTH - 10;

    // If it still doesn't fit (or is too far left), just center it horizontally
    if (left < WINDOW_PADDING) {
      left = (window.innerWidth - PREVIEW_WIDTH) / 2;
    }
  }

  // 2. Ensure the card is within the top edge of the viewport
  if (top < WINDOW_PADDING) {
    top = WINDOW_PADDING;
  }

  // 3. Ensure the card is within the bottom edge of the viewport
  if (top + PREVIEW_HEIGHT + WINDOW_PADDING > window.innerHeight) {
    top = window.innerHeight - PREVIEW_HEIGHT - WINDOW_PADDING;
  }

  // Final check to prevent placing outside the left boundary if necessary (mostly covered by centering logic above)
  if (left < WINDOW_PADDING) {
    left = WINDOW_PADDING;
  }


  return (
    // Fixed positioning to float above everything else
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${PREVIEW_WIDTH}px`,
        height: `${PREVIEW_HEIGHT}px`,
      }}
    >
        <div
          className="relative rounded-2xl shadow-2xl pop-in transform origin-top-left"
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(147, 51, 234, 0.8), 0 0 40px rgba(147, 51, 234, 0.5)',
          }}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-auto rounded-2xl aspect-[2.5/3.5] object-cover border-4 border-white ring-4 ring-purple-600"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/${PREVIEW_WIDTH}x${PREVIEW_HEIGHT}/374151/FFFFFF?text=${encodeURIComponent(card.name)}`;
              (e.target as HTMLImageElement).onerror = null;
            }}
          />
        </div>
    </div>
  );
};
