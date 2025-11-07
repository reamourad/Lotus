'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from "@/components/Header";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDroppable, useDraggable } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// === CONFIGURATION CONSTANTS ===
// Default card display width in pixels
const DEFAULT_CARD_WIDTH = 170;
const MIN_CARD_WIDTH = 120;
const MAX_CARD_WIDTH = 350;

// MTG card aspect ratio (don't change this)
const CARD_ASPECT_RATIO = 2.5 / 3.5;

// Scryfall image quality
// Available versions and their sizes:
// - 'small': 146 x 204 (not recommended, too low quality)
// - 'normal': 488 x 680 (good for smaller displays)
// - 'large': 672 x 936 (good balance)
// - 'png': 745 x 1040 (highest quality, recommended)
// For card sizes up to 300px, 'png' is recommended
// For larger sizes (300px+), 'png' is essential for clarity
const SCRYFALL_IMAGE_VERSION = 'png';
// ==========================================================

// --- Type Definitions ---
interface Card {
  name: string;
  imageUrl: string;
  id: string; // Unique identifier for picking/keys
  cmc: number; // Converted mana cost
  columnId?: number; // Which column the card is assigned to (for manual organization)
}

interface BoosterData {
  // Corrected structure based on the console error report
  pack: string[];
  set: string;
  count: number;
}

interface HoverPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const API_ENDPOINT = 'https://mtgdraftassistant.onrender.com/booster?set=MH3';

/**
 * Generates a Scryfall URL that redirects to the high-resolution card image.
 */
const getScryfallImageUrl = (cardName: string): string => {
  const encodedName = encodeURIComponent(cardName);
  return `https://api.scryfall.com/cards/named?exact=${encodedName}&format=image&version=${SCRYFALL_IMAGE_VERSION}`;
};

// CSS Keyframe for modern animation (Injecting the style tag directly)
const HOVER_PREVIEW_STYLE = `
@keyframes pop-in {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}
.pop-in {
    animation: pop-in 0.3s ease-out forwards;
}

@keyframes radiate {
    0%, 100% {
        box-shadow: 0 -8px 16px rgba(250, 204, 21, 0.6), 0 -4px 8px rgba(250, 204, 21, 0.4), 0 -2px 4px rgba(250, 204, 21, 0.3);
    }
    50% {
        box-shadow: 0 -16px 28px rgba(250, 204, 21, 0.8), 0 -8px 16px rgba(250, 204, 21, 0.6), 0 -4px 8px rgba(250, 204, 21, 0.4);
    }
}
.radiate {
    animation: radiate 2s ease-in-out infinite;
}

/* Custom slider styles */
input[type="range"].slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #9333ea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"].slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #9333ea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"].slider::-webkit-slider-thumb:hover {
    background: #a855f7;
    transform: scale(1.1);
}

input[type="range"].slider::-moz-range-thumb:hover {
    background: #a855f7;
    transform: scale(1.1);
}
`;


// Card Hover Preview Component (The "Zoom" Effect)
const CardHoverPreview: React.FC<{ card: Card | null; cardPosition: HoverPosition | null }> = ({ card, cardPosition }) => {
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

// Draggable Card Component for Mana Curve
const DraggableCard: React.FC<{ card: Card; index: number }> = ({ card, index }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  // Calculate natural stacking with slight rotation and offset
  const naturalRotation = (index % 3 - 1) * 2; // Slight rotation between -2 and 2 degrees
  const naturalOffsetX = (index % 3 - 1) * 3; // Slight horizontal offset

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : {
        transform: `rotate(${naturalRotation}deg) translateX(${naturalOffsetX}px)`,
      };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: `${DEFAULT_CARD_WIDTH}px` }}
      {...attributes}
      {...listeners}
      className="rounded-xl overflow-hidden shadow-lg hover:scale-105 cursor-grab active:cursor-grabbing will-change-transform"
      title={card.name}
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
const DroppableColumn: React.FC<{
  columnId: number;
  cards: Card[];
  isOver: boolean;
}> = ({ columnId, cards, isOver }) => {
  const { setNodeRef } = useDroppable({
    id: `column-${columnId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 ${isOver ? 'bg-purple-900/10' : ''}`}
      style={{
        minWidth: `${DEFAULT_CARD_WIDTH + 32}px`,
        transition: 'background-color 0.2s'
      }}
    >
      <div className="flex flex-col items-center">
        {/* Column of stacked cards */}
        <div
          className="relative w-full flex justify-center"
          style={{
            minHeight: cards.length > 0 ? `${(DEFAULT_CARD_WIDTH / CARD_ASPECT_RATIO) + (cards.length - 1) * 30}px` : '250px',
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
              <DraggableCard card={card} index={idx} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mana Curve Display Component
const ManaCurveDisplay: React.FC<{
  draftedCards: Card[];
  onReorder: (newCards: Card[]) => void;
}> = ({ draftedCards, onReorder }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
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

  // Organize cards by their stack position
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

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
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

      // Update the card's CMC
      const updatedCards = draftedCards.map(card =>
        card.id === active.id ? { ...card, cmc: targetCmc } : card
      );
      onReorder(updatedCards);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Drafted Cards</h2>
      {draftedCards.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No cards drafted yet. Select a card and click CONFIRM PICK to start building your deck.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
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
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};

// Individual Card Component
const BoosterCard: React.FC<{
  card: Card;
  isSelected: boolean;
  onCardClick: (card: Card) => void;
  onCardHover: (card: Card, rect: DOMRect) => void;
  onMouseLeave: () => void;
  isHoverEnabled: boolean;
}> = ({ card, isSelected, onCardClick, onCardHover, onMouseLeave, isHoverEnabled }) => {
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

// Main Grid Component now uses FLEXBOX for simple wrapping
const BoosterGrid: React.FC<{
  cards: Card[];
  selectedCardId: string | null;
  onCardClick: (card: Card) => void;
  onCardHover: (card: Card, rect: DOMRect) => void;
  onMouseLeave: () => void;
  isHoverEnabled: boolean;
  cardWidth: number;
}> = ({ cards, selectedCardId, onCardClick, onCardHover, onMouseLeave, isHoverEnabled, cardWidth }) => {

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


// --- Main Play Page Component ---
export default function PlayPage() {
  const [boosterCards, setBoosterCards] = useState<Card[]>([]);
  const [pickedCards, setPickedCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{ card: Card; position: HoverPosition } | null>(null);
  const [isHoverPreviewEnabled, setIsHoverPreviewEnabled] = useState(true);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle function for the hover preview setting
  const handleToggleHoverPreview = () => {
    setIsHoverPreviewEnabled(prev => {
      if (prev) {
        setHoveredCard(null);
      }
      return !prev;
    });
  };

  // Function to map DOMRect to our simpler HoverPosition type
  const mapRectToPosition = useCallback((rect: DOMRect): HoverPosition => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }), []);

  // Handler for when a card is hovered, capturing its position
  const handleCardHover = useCallback((card: Card, rect: DOMRect) => {
    setHoveredCard({ card, position: mapRectToPosition(rect) });
  }, [mapRectToPosition]);

  // Handler for when the mouse leaves the card area
  const handleMouseLeave = useCallback(() => {
    setHoveredCard(null);
  }, []);

  // Inject styles on client side only to avoid hydration mismatch
  useEffect(() => {
    const styleId = 'play-page-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = HOVER_PREVIEW_STYLE;
      document.head.appendChild(style);
    }
  }, []);

  // Function to fetch the booster data
  useEffect(() => {
    const fetchBooster = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
          throw new Error(`Failed to load booster pack (HTTP status: ${response.status})`);
        }
        const data: BoosterData = await response.json();

        if (!data || !Array.isArray(data.pack)) {
            console.error("API response structure is unexpected:", data);
            throw new Error("Invalid API response: 'pack' array is missing or malformed.");
        }

        // Fetch card data including mana cost from Scryfall
        const cardsWithData: Card[] = [];
        for (const cardName of data.pack) {
          try {
            const scryfallResponse = await fetch(
              `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );
            if (scryfallResponse.ok) {
              const cardData = await scryfallResponse.json();
              cardsWithData.push({
                name: cardName,
                imageUrl: getScryfallImageUrl(cardName),
                id: `${cardName}-${cardsWithData.length}-${Date.now()}`,
                cmc: cardData.cmc || 0,
              });
            }
          } catch (error) {
            console.error(`Error fetching card data for ${cardName}:`, error);
            // Fallback if fetch fails
            cardsWithData.push({
              name: cardName,
              imageUrl: getScryfallImageUrl(cardName),
              id: `${cardName}-${cardsWithData.length}-${Date.now()}`,
              cmc: 0,
            });
          }
        }

        setBoosterCards(cardsWithData);
      } catch (e) {
        console.error("Fetch Error:", e);
        setError(e instanceof Error ? e.message : "An unknown data loading error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooster();
  }, []);

  // Handle clicking a card in the booster (selection)
  const handleCardSelection = (card: Card) => {
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  // Handle the 'CONFIRM PICK' action
  const handleConfirmPick = () => {
    if (!selectedCardId) return;

    const pickedCard = boosterCards.find(c => c.id === selectedCardId);

    if (pickedCard) {
        setPickedCards([...pickedCards, pickedCard]);
        setBoosterCards(boosterCards.filter(c => c.id !== selectedCardId));

        setSelectedCardId(null);
        setHoveredCard(null);
    }
  };

  const isPickReady = selectedCardId !== null;

  return (
    <>
      <Header onSettingsClick={() => setIsSettingsOpen(true)} activeTab="/play" />

      <div className="min-h-screen font-sans flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
        {/* Background gradient image - positioned at bottom */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none overflow-hidden">
          <img
            src="/gradient.png"
            alt="Background gradient"
            className="w-full h-[60vh] object-fill opacity-20"
          />
        </div>

        <main className="px-4 md:px-8 pt-2 pb-4 flex-grow relative z-10">
          {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Settings Card */}
            <div
              className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close Settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Settings Content */}
              <div className="space-y-6">
                {/* Card Size Slider */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Card Size
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min={MIN_CARD_WIDTH}
                      max={MAX_CARD_WIDTH}
                      value={cardWidth}
                      onChange={(e) => setCardWidth(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #9333ea 0%, #9333ea ${((cardWidth - MIN_CARD_WIDTH) / (MAX_CARD_WIDTH - MIN_CARD_WIDTH)) * 100}%, #4b5563 ${((cardWidth - MIN_CARD_WIDTH) / (MAX_CARD_WIDTH - MIN_CARD_WIDTH)) * 100}%, #4b5563 100%)`
                      }}
                    />
                    <span className="text-sm text-gray-400 font-mono w-12 text-right">{cardWidth}px</span>
                  </div>
                </div>

                {/* Hover Preview Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Hover Preview
                    </label>
                    <p className="text-xs text-gray-500">
                      Show enlarged card on hover
                    </p>
                  </div>
                  <button
                    onClick={handleToggleHoverPreview}
                    className={`relative inline-flex flex-shrink-0 h-7 w-12 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 ${
                      isHoverPreviewEnabled ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={isHoverPreviewEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        isHoverPreviewEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-purple-400 text-xl">
            <div className="animate-pulse">Opening Booster Pack...</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500">
            <h1 className="mt-10 text-2xl font-bold">Error Loading Data</h1>
            <p>{error}</p>
            <p className="mt-4 text-gray-400 text-sm">Please check the console for the API's actual response structure. The app expects a top-level 'pack' array.</p>
          </div>
        ) : (
          <>
            <BoosterGrid
              cards={boosterCards}
              selectedCardId={selectedCardId}
              onCardClick={handleCardSelection}
              onCardHover={handleCardHover}
              onMouseLeave={handleMouseLeave}
              isHoverEnabled={isHoverPreviewEnabled}
              cardWidth={cardWidth}
            />

            {/* Confirmation Button Area */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleConfirmPick}
                className={`px-8 py-3 rounded-full text-white font-extrabold tracking-wider transition-all shadow-lg ${
                  isPickReady
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/50'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isPickReady}
              >
                CONFIRM PICK
              </button>
            </div>

            <hr
              className="my-8 border-yellow-500 -mx-4 md:-mx-8"
              style={{
                borderWidth: '4px',
                boxShadow: '0 -8px 16px rgba(234, 179, 8, 0.5), 0 -4px 8px rgba(234, 179, 8, 0.3), 0 -2px 4px rgba(234, 179, 8, 0.2)'
              }}
            />

            {/* Mana Curve Display */}
            <ManaCurveDisplay
              draftedCards={pickedCards}
              onReorder={setPickedCards}
            />
          </>
        )}
      </main>

        {/* Renders the full-size card preview only if enabled */}
        {isHoverPreviewEnabled && hoveredCard && (
          <CardHoverPreview
            card={hoveredCard.card}
            cardPosition={hoveredCard.position}
          />
        )}
      </div>
    </>
  );
}
