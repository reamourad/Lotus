import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card } from '../types';
import { CARD_ASPECT_RATIO } from '../utils/constants';

// Draggable Card Component for Mana Curve
export const DraggableCard: React.FC<{
  card: Card;
  cardWidth: number;
  onCardClick?: (card: Card) => void;
}> = ({ card, cardWidth, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  // Style for dragging or static display
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : {};

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger click if not dragging
    if (!isDragging && onCardClick) {
      e.stopPropagation();
      onCardClick(card);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: `${cardWidth}px` }}
      {...attributes}
      {...listeners}
      className="rounded-xl overflow-hidden shadow-lg hover:scale-105 cursor-grab active:cursor-grabbing will-change-transform"
      title={card.name}
      onClick={handleClick}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="w-full h-auto aspect-[2.5/3.5] object-cover pointer-events-none"
        draggable={false}
      />
    </div>
  );
};

// Droppable Column Component
export const DroppableColumn: React.FC<{
  columnId: number;
  cmc: number | null;
  cards: Card[];
  isOver: boolean;
  cardWidth: number;
  onCardClick?: (card: Card) => void;
  maxCards: number;
}> = ({ columnId, cmc, cards, isOver, cardWidth, onCardClick, maxCards }) => {
  const { setNodeRef } = useDroppable({
    id: `column-${columnId}`,
  });

  const barHeight = maxCards > 0 ? (cards.length / maxCards) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      className={`relative pt-4 rounded-lg transition-colors duration-200 ${isOver ? 'bg-purple-900/20' : ''}`}
      style={{
        minWidth: `${cardWidth + 32}px`,
      }}
    >
      {/* Bar chart background */}
      <div className="absolute bottom-0 left-0 right-0 bg-purple-500/10 rounded-t-lg" style={{ height: `${barHeight}%`, transition: 'height 0.3s ease-out' }} />

      {/* CMC Header */}
      <div className="text-center mb-4 h-8 flex items-center justify-center">
        <span className="text-xl font-bold text-white bg-black/30 rounded-full px-3 py-1">{cmc !== null ? cmc : '...'}</span>
      </div>

      <div className="flex flex-col items-center">
        {/* Column of stacked cards */}
        <div
          className="relative w-full flex justify-center"
          style={{
            minHeight: cards.length > 0 ? `${(cardWidth / CARD_ASPECT_RATIO) + (cards.length - 1) * 25}px` : '250px',
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className="absolute will-change-transform transition-all duration-300 ease-out"
              style={{
                top: `${idx * 25}px`, // Reduced overlap
                zIndex: idx,
                // Consistent "messy" look based on card ID
                transform: `rotate(${Math.sin(card.id.charCodeAt(0)) * 1.5}deg) translateX(${Math.cos(card.id.charCodeAt(1)) * 1.5}px)`,
              }}
            >
              <DraggableCard card={card} cardWidth={cardWidth} onCardClick={onCardClick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
