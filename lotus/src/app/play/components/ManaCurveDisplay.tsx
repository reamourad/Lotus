import React, { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { Card } from '../types';
import { DroppableColumn } from './DraftedCardComponents';

interface ManaCurveDisplayProps {
  draftedCards: Card[];
  onReorder: (newCards: Card[]) => void;
  cardWidth: number;
}

// Mana Curve Display Component
export const ManaCurveDisplay: React.FC<ManaCurveDisplayProps> = ({ draftedCards, onReorder, cardWidth }) => {
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Get unique CMC values and sort them
  const uniqueCmcs = Array.from(new Set(draftedCards.map(card => card.cmc))).sort((a, b) => a - b);

  // Map CMC to stack index (dynamic positioning)
  const cmcToStackIndex: { [key: number]: number } = {};
  uniqueCmcs.forEach((cmc, index) => {
    cmcToStackIndex[cmc] = index;
  });

  // Organize cards by their stack position (preserve order, don't sort within stack)
  const cardsByStack: { [key: number]: Card[] } = {};
  draftedCards.forEach(card => {
    const stackIndex = cmcToStackIndex[card.cmc];
    if (!cardsByStack[stackIndex]) {
      cardsByStack[stackIndex] = [];
    }
    cardsByStack[stackIndex].push(card);
  });

  // Number of visible stacks = number of unique CMCs + 1 (for dropping into new positions)
  const numVisibleStacks = uniqueCmcs.length + 1;

  // Track which CMC each stack represents (for the drag handler)
  const stackToCmc: { [key: number]: number | null } = {};
  uniqueCmcs.forEach((cmc, index) => {
    stackToCmc[index] = cmc;
  });
  stackToCmc[numVisibleStacks - 1] = null; // Last stack is for new cards

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setOverId(null);

    if (!over) return;

    const overId = over.id as string;

    // Check if dropped on a column
    if (overId.startsWith('column-')) {
      const targetStackIndex = parseInt(overId.replace('column-', ''));
      const draggedCard = draftedCards.find(card => card.id === active.id);

      if (!draggedCard) return;

      // Determine the target CMC based on where it was dropped
      let targetCmc: number;

      if (stackToCmc[targetStackIndex] !== undefined && stackToCmc[targetStackIndex] !== null) {
        // Dropped on existing stack - use that CMC
        targetCmc = stackToCmc[targetStackIndex] as number;
      } else {
        // Dropped on empty stack at the end - need to determine new CMC
        // Find the highest CMC and add 1
        const maxCmc = uniqueCmcs.length > 0 ? Math.max(...uniqueCmcs) : -1;
        targetCmc = maxCmc + 1;
      }

      // Remove the card from its current position and add it to the end with new CMC
      // This ensures the most recently moved card appears on top of its stack
      const otherCards = draftedCards.filter(card => card.id !== active.id);
      const updatedCard = { ...draggedCard, cmc: targetCmc };
      const updatedCards = [...otherCards, updatedCard];

      onReorder(updatedCards);
    }
  };

  const handleDragCancel = () => {
    setOverId(null);
  };

  return (
    <div className="space-y-4">
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
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {Array.from({ length: numVisibleStacks }, (_, i) => i).map(stackId => (
              <DroppableColumn
                key={stackId}
                columnId={stackId}
                cards={cardsByStack[stackId] || []}
                isOver={overId === `column-${stackId}`}
                cardWidth={cardWidth}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};
