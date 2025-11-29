import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { Card } from '../types';
import { DroppableColumn } from './DraftedCardComponents';

interface ManaCurveDisplayProps {
  draftedCards: Card[];
  onReorder: (newCards: Card[]) => void;
  cardWidth: number;
  onCardClick?: (card: Card) => void;
}

// Mana Curve Display Component
export const ManaCurveDisplay: React.FC<ManaCurveDisplayProps> = ({ draftedCards, onReorder, cardWidth, onCardClick }) => {
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Increase distance to avoid accidental drags
      },
    })
  );

  // Memoize all calculations for performance
  const {
    uniqueCmcs,
    cardsByStack,
    numVisibleStacks,
    stackToCmc,
    maxCardsInStack
  } = useMemo(() => {
    console.time("Recalculate Mana Curve");
    const cmcs = draftedCards.map(card => card.cmc);
    const uniqueCmcs = Array.from(new Set(cmcs)).sort((a, b) => a - b);

    const cmcToStackIndex: { [key: number]: number } = {};
    uniqueCmcs.forEach((cmc, index) => {
      cmcToStackIndex[cmc] = index;
    });

    const cardsByStack: { [key: number]: Card[] } = {};
    uniqueCmcs.forEach((_, index) => {
      cardsByStack[index] = [];
    });

    draftedCards.forEach(card => {
      const stackIndex = cmcToStackIndex[card.cmc];
      if (cardsByStack[stackIndex]) {
        cardsByStack[stackIndex].push(card);
      }
    });

    // Ensure stacks are sorted by original pick order if needed (or keep as is)
    // For now, order is based on draftedCards array order.

    const numVisibleStacks = uniqueCmcs.length > 0 ? uniqueCmcs.length + 1 : 1;

    const stackToCmc: { [key: number]: number | null } = {};
    uniqueCmcs.forEach((cmc, index) => {
      stackToCmc[index] = cmc;
    });
    // The last column is for creating a new, higher CMC pile
    stackToCmc[numVisibleStacks - 1] = null;

    const maxCardsInStack = Object.values(cardsByStack).reduce((max, stack) => Math.max(max, stack.length), 0);
    console.timeEnd("Recalculate Mana Curve");
    return { uniqueCmcs, cardsByStack, numVisibleStacks, stackToCmc, maxCardsInStack };
  }, [draftedCards]);


  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setOverId(null);

    if (!over || active.id === over.id) return;

    const overId = over.id as string;

    if (overId.startsWith('column-')) {
      const targetStackIndex = parseInt(overId.replace('column-', ''), 10);
      const draggedCard = draftedCards.find(card => card.id === active.id);

      if (!draggedCard) return;

      let targetCmc: number;

      if (stackToCmc[targetStackIndex] !== undefined && stackToCmc[targetStackIndex] !== null) {
        targetCmc = stackToCmc[targetStackIndex] as number;
      } else {
        const maxCmc = uniqueCmcs.length > 0 ? Math.max(...uniqueCmcs) : -1;
        targetCmc = maxCmc + 1;
      }
      
      // Avoid reordering if dropped on the same logical CMC column
      if (draggedCard.cmc === targetCmc) return;

      const otherCards = draftedCards.filter(card => card.id !== active.id);
      const updatedCard = { ...draggedCard, cmc: targetCmc };
      
      // Re-create the array to ensure React state update
      const updatedCards = [...otherCards, updatedCard];

      onReorder(updatedCards);
    }
  };

  const handleDragCancel = () => {
    setOverId(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-white px-4">Your Deck</h2>
      {draftedCards.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No cards drafted yet. Select a card and click CONFIRM PICK to start building your deck.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 items-start overflow-x-auto pb-4 px-4">
            {Array.from({ length: numVisibleStacks }, (_, i) => (
              <DroppableColumn
                key={`col-${stackToCmc[i] ?? 'new'}`}
                columnId={i}
                cmc={stackToCmc[i]}
                cards={cardsByStack[i] || []}
                isOver={overId === `column-${i}`}
                cardWidth={cardWidth}
                onCardClick={onCardClick}
                maxCards={maxCardsInStack}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};
