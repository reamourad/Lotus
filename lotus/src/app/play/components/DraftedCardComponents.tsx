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

// Droppable Column Component (Invisible)
export const DroppableColumn: React.FC<{
  columnId: number;
  cards: Card[];
  isOver: boolean;
  cardWidth: number;
  onCardClick?: (card: Card) => void;
}> = ({ columnId, cards, isOver, cardWidth, onCardClick }) => {
  const { setNodeRef } = useDroppable({
    id: `column-${columnId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 ${isOver ? 'bg-purple-900/10' : ''}`}
      style={{
        minWidth: `${cardWidth + 32}px`,
        transition: 'background-color 0.2s'
      }}
    >
      <div className="flex flex-col items-center">
        {/* Column of stacked cards */}
        <div
          className="relative w-full flex justify-center"
          style={{
            minHeight: cards.length > 0 ? `${(cardWidth / CARD_ASPECT_RATIO) + (cards.length - 1) * 30}px` : '250px',
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={card.id}
              className="absolute will-change-transform"
              style={{
                top: `${idx * 30}px`,
                zIndex: idx,
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