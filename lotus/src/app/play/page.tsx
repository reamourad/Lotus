'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from "@/components/Header";
import { Card, DraftState, HoverPosition, Player } from './types';
import {
  DEFAULT_CARD_WIDTH,
  MIN_CARD_WIDTH,
  MAX_CARD_WIDTH,
  HOVER_PREVIEW_STYLE
} from './utils/constants';
import {
  saveDraftToLocalStorage,
  loadDraftFromLocalStorage,
  clearDraftFromLocalStorage
} from './utils/storage';
import {
  preloadImages,
  fetchPackAsCards,
  makeBotPick
} from './utils/api';
import { CardHoverPreview } from './components/CardHoverPreview';
import { BoosterGrid } from './components/BoosterGrid';
import { ManaCurveDisplay } from './components/ManaCurveDisplay';

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

  // Draft state
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [currentSet, setCurrentSet] = useState('mh3');
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  // Initialize draft with 8 players
  const initializeDraft = async (clearStorage = true) => {
    if (clearStorage) {
      clearDraftFromLocalStorage();
    }

    // Reset all state
    setSelectedCardId(null);
    setHoveredCard(null);
    setPickedCards([]);
    setLoading(true);
    setError(null);

    try {
      // Fetch 8 packs (one for each player)
      const packsPromises = Array.from({ length: 8 }, () => fetchPackAsCards(currentSet));
      const packs = await Promise.all(packsPromises);

      // Preload images for the human player's pack
      await preloadImages(packs[0]);

      // Create 8 players
      const players: Player[] = packs.map((pack, index) => ({
        id: index,
        isHuman: index === 0, // Player 0 is the human
        picks: [],
        currentPack: pack,
      }));

      setDraftState({
        currentBooster: 1,
        currentPick: 1,
        players,
        direction: 'clockwise',
      });

      // Set the human player's pack as the visible booster
      setBoosterCards(packs[0]);
    } catch (e) {
      console.error("Draft initialization error:", e);
      setError(e instanceof Error ? e.message : "Failed to initialize draft.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize draft on mount - try to restore from localStorage first
  useEffect(() => {
    // Check if this is a page refresh or new navigation
    const isPageRefresh = sessionStorage.getItem('draft_page_visited') === 'true';

    if (isPageRefresh) {
      // This is a page refresh, try to restore from localStorage
      const savedDraft = loadDraftFromLocalStorage();
      if (savedDraft && savedDraft.draftState) {
        // Restore draft state and derive booster cards from the human player's current pack
        setDraftState(savedDraft.draftState);
        setPickedCards(savedDraft.pickedCards);
        setBoosterCards(savedDraft.draftState.players[0].currentPack);
        setCurrentSet(savedDraft.currentSet);
        setSelectedCardId(null);
        setHoveredCard(null);
        setLoading(false);
      } else {
        // No saved draft, start new one
        initializeDraft();
      }
    } else {
      // This is a new navigation, start fresh draft
      sessionStorage.setItem('draft_page_visited', 'true');
      initializeDraft();
    }

    // Cleanup: Clear the session flag when navigating away
    return () => {
      sessionStorage.removeItem('draft_page_visited');
    };
  }, []);

  // Save draft state whenever it changes
  useEffect(() => {
    if (draftState && !loading) {
      saveDraftToLocalStorage(draftState, pickedCards, currentSet);
    }
  }, [draftState, pickedCards, currentSet, loading]);

  // Handle clicking a card in the booster (selection)
  const handleCardSelection = (card: Card) => {
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  // Process all picks for the current round
  const processRound = async () => {
    if (!draftState) return;

    const updatedPlayers = [...draftState.players];

    // Process bot picks in parallel
    const botPickPromises = updatedPlayers
      .filter(p => !p.isHuman && p.currentPack.length > 0)
      .map(async (player) => {
        const pickedCard = await makeBotPick(player, currentSet);
        return { playerId: player.id, pickedCard };
      });

    const botPicks = await Promise.all(botPickPromises);

    // Apply bot picks
    botPicks.forEach(({ playerId, pickedCard }) => {
      const player = updatedPlayers[playerId];
      player.picks.push(pickedCard);
      player.currentPack = player.currentPack.filter(c => c.id !== pickedCard.id);
    });

    // Pass packs
    const newPacks: Card[][] = updatedPlayers.map(() => []);

    if (draftState.direction === 'clockwise') {
      for (let i = 0; i < 8; i++) {
        const nextPlayerIndex = (i + 1) % 8;
        newPacks[nextPlayerIndex] = updatedPlayers[i].currentPack;
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const nextPlayerIndex = (i - 1 + 8) % 8;
        newPacks[nextPlayerIndex] = updatedPlayers[i].currentPack;
      }
    }

    updatedPlayers.forEach((player, index) => {
      player.currentPack = newPacks[index];
    });

    // Check if booster is done
    const allPacksEmpty = updatedPlayers.every(p => p.currentPack.length === 0);

    if (allPacksEmpty) {
      // Start next booster
      if (draftState.currentBooster < 3) {
        await startNextBooster(updatedPlayers);
      } else {
        // Draft complete
        setDraftState({
          ...draftState,
          players: updatedPlayers,
        });
      }
    } else {
      // Continue to next pick
      setDraftState({
        ...draftState,
        currentPick: draftState.currentPick + 1,
        players: updatedPlayers,
      });

      // Preload images before showing new pack
      await preloadImages(updatedPlayers[0].currentPack);
      setBoosterCards(updatedPlayers[0].currentPack);
    }
  };

  // Start the next booster
  const startNextBooster = async (players: Player[]) => {
    if (!draftState) return;

    try {
      // Show loading screen
      setLoading(true);

      // Fetch new packs for all players
      const packsPromises = Array.from({ length: 8 }, () => fetchPackAsCards(currentSet));
      const packs = await Promise.all(packsPromises);

      // Preload images for human player's new pack
      await preloadImages(packs[0]);

      players.forEach((player, index) => {
        player.currentPack = packs[index];
      });

      const newBooster = draftState.currentBooster + 1;
      const newDirection = newBooster % 2 === 1 ? 'clockwise' : 'counterclockwise';

      setDraftState({
        currentBooster: newBooster,
        currentPick: 1,
        players,
        direction: newDirection,
      });

      setBoosterCards(players[0].currentPack);
    } catch (error) {
      console.error('Error starting next booster:', error);
      setError('Failed to start next booster');
    } finally {
      // Hide loading screen
      setLoading(false);
    }
  };

  // Handle the 'CONFIRM PICK' action
  const handleConfirmPick = async () => {
    if (!selectedCardId || !draftState) return;

    const pickedCard = boosterCards.find(c => c.id === selectedCardId);

    if (pickedCard) {
      setIsTransitioning(true);

      // Add to human player's picks
      setPickedCards([...pickedCards, pickedCard]);

      // Update draft state
      const updatedPlayers = [...draftState.players];
      const humanPlayer = updatedPlayers[0];
      humanPlayer.picks.push(pickedCard);
      humanPlayer.currentPack = humanPlayer.currentPack.filter(c => c.id !== selectedCardId);

      setDraftState({
        ...draftState,
        players: updatedPlayers,
      });

      setSelectedCardId(null);
      setHoveredCard(null);

      // Process bot picks and pass packs (this will update boosterCards with the new pack)
      await processRound();

      setIsTransitioning(false);
    }
  };

  const isPickReady = selectedCardId !== null;

  return (
    <>
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        activeTab="/play"
        boosterNumber={draftState?.currentBooster || 1}
        pickNumber={draftState?.currentPick || 1}
      />

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

        {error ? (
          <div className="text-center text-red-500">
            <h1 className="mt-10 text-2xl font-bold">Error Loading Data</h1>
            <p>{error}</p>
            <p className="mt-4 text-gray-400 text-sm">Please check the console for the API&apos;s actual response structure. The app expects a top-level &apos;pack&apos; array.</p>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64 text-purple-400 text-xl">
                <div className="animate-pulse">Opening Booster Pack...</div>
              </div>
            ) : (
              <>
                <div>
                  <BoosterGrid
                    cards={boosterCards}
                    selectedCardId={selectedCardId}
                    onCardClick={handleCardSelection}
                    onCardHover={handleCardHover}
                    onMouseLeave={handleMouseLeave}
                    isHoverEnabled={isHoverPreviewEnabled && !isTransitioning}
                    cardWidth={cardWidth}
                  />
                </div>

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
              </>
            )}

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
              cardWidth={cardWidth}
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
