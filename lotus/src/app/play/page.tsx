'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from "@/components/Header";
import { Card, DraftState, HoverPosition, Player, Settings } from './types';
import {
  DEFAULT_CARD_WIDTH,
  MIN_CARD_WIDTH,
  MAX_CARD_WIDTH,
  HOVER_PREVIEW_STYLE
} from './utils/constants';
import {
  saveDraftToLocalStorage,
  loadDraftFromLocalStorage,
  clearDraftFromLocalStorage,
  saveSettings,
  loadSettings
} from './utils/storage';
import {
  preloadImages,
  fetchPackAsCards,
  makeBotPick
} from './utils/api';
import { CardHoverPreview } from './components/CardHoverPreview';
import { BoosterGrid } from './components/BoosterGrid';
import { ManaCurveDisplay } from './components/ManaCurveDisplay';
import { CardViewer } from './components/CardViewer';
import { DraftResults } from './components/DraftResults'; // Import DraftResults

// --- Main Play Page Component ---
export default function PlayPage() {
  const [boosterCards, setBoosterCards] = useState<Card[]>([]);
  const [pickedCards, setPickedCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{ card: Card; position: HoverPosition } | null>(null);
  const [isHoverPreviewEnabled, setIsHoverPreviewEnabled] = useState(true);
  const [isAiPredictionEnabled, setIsAiPredictionEnabled] = useState(true);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft state
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [currentSet, setCurrentSet] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedSet') || 'mh3';
    }
    return 'mh3';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Card viewer state
  const [viewedCardIndex, setViewedCardIndex] = useState<number | null>(null);

  // AI prediction state
  const [aiPredictions, setAiPredictions] = useState<Array<{ card_name: string; probability: number }> | null>(null);
  const predictionAbortController = useRef<AbortController | null>(null);
  const lastPredictionPackKey = useRef<string>('');

  // Determine if draft is complete
  const isDraftComplete = draftState && draftState.currentBooster === 3 && draftState.players.every(p => p.currentPack.length === 0);

  // Toggle function for the hover preview setting
  const handleToggleHoverPreview = () => {
    setIsHoverPreviewEnabled(prev => {
      if (prev) {
        setHoveredCard(null);
      }
      return !prev;
    });
  };

  const handleToggleAiPrediction = () => {
    setIsAiPredictionEnabled(prev => !prev);
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
  const initializeDraft = useCallback(async (clearStorage = true) => {
    if (clearStorage) {
      clearDraftFromLocalStorage();
    }

    // Reset all state
    setSelectedCardId(null);
    setHoveredCard(null);
    setPickedCards([]);
    setLoading(true);
    setError(null);
    setAiPredictions(null); // Clear old predictions
    lastPredictionPackKey.current = ''; // Reset prediction tracking for new draft

    try {
      // Fetch all 8 packs in PARALLEL for speed
      const packPromises = Array.from({ length: 8 }, () =>
        fetchPackAsCards(currentSet, true)
      );

      const packs = await Promise.all(packPromises);

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
  }, [currentSet]); // Add currentSet to dependency array as it's used inside initializeDraft

  // Initialize draft on mount - try to restore from localStorage first
  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = loadSettings();
    if (savedSettings) {
      setIsHoverPreviewEnabled(savedSettings.isHoverPreviewEnabled);
      setIsAiPredictionEnabled(savedSettings.isAiPredictionEnabled);
    }

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
  }, [initializeDraft]);

  // Save draft state whenever it changes
  useEffect(() => {
    if (draftState && !loading) {
      saveDraftToLocalStorage(draftState, pickedCards, currentSet);
    }
  }, [draftState, pickedCards, currentSet, loading]);

  // Save settings whenever they change
  useEffect(() => {
    const settings: Settings = {
      isHoverPreviewEnabled,
      isAiPredictionEnabled,
    };
    saveSettings(settings);
  }, [isHoverPreviewEnabled, isAiPredictionEnabled]);

  // Handle clicking a card in the booster (selection)
  const handleCardSelection = (card: Card) => {
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  // Fetch AI predictions for current pack
  const fetchAiPredictions = useCallback(async () => {
    if (!draftState || boosterCards.length === 0) return;

    // Create a unique key for this pack to prevent duplicate requests
    const packCardNames = boosterCards.map(c => c.name);
    const packKey = packCardNames.sort().join('|');

    // Skip if we've already requested predictions for this exact pack
    if (packKey === lastPredictionPackKey.current) {
      console.log('Skipping duplicate prediction request for same pack');
      return;
    }

    // Cancel any previous in-flight request
    if (predictionAbortController.current) {
      predictionAbortController.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    predictionAbortController.current = abortController;
    lastPredictionPackKey.current = packKey;

    try {
      const deckCardNames = pickedCards.map(c => c.name);

      const requestBody = {
        pack: packCardNames,
        deck: deckCardNames,
        set: currentSet,
      };

      console.log('=== AI PREDICTION API CALL ===');
      console.log('URL:', 'https://mtgdraftassistant.onrender.com/predict');
      console.log('Method:', 'POST');
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Pack size:', packCardNames.length);
      console.log('Deck size:', deckCardNames.length);

      const response = await fetch('https://mtgdraftassistant.onrender.com/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI predictions received:', JSON.stringify(data, null, 2)); // Log full response
        if (data.predictions && Array.isArray(data.predictions)) {
          // Validate that predictions match current pack (prevent race condition)
          const currentPackNames = boosterCards.map(c => c.name);
          const predictedCardNames = data.predictions.map((p: { card_name: string }) => p.card_name);

          // Check if at least one prediction matches the current pack
          const hasMatch = predictedCardNames.some((name: string) => currentPackNames.includes(name));

          if (hasMatch) {
            setAiPredictions(data.predictions);
          } else {
            console.warn('AI predictions do not match current pack - ignoring stale predictions');
            console.log('Current pack:', currentPackNames);
            console.log('Predicted for:', predictedCardNames);
          }
        }
      }
    } catch (error) {
      // Ignore abort errors (these are expected when we cancel requests)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('AI prediction request cancelled (newer request in progress)');
        return;
      }
      console.error('Error fetching AI predictions:', error);
    }
  }, [draftState, boosterCards, pickedCards, currentSet]);

  // Fetch predictions when booster cards change
  useEffect(() => {
    if (boosterCards.length > 0 && !loading && !isDraftComplete && isAiPredictionEnabled) { // Only fetch if draft not complete
      fetchAiPredictions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boosterCards, loading, isDraftComplete, isAiPredictionEnabled]);

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
        // Draft complete - set draftState to reflect final state
        setDraftState({
          ...draftState,
          currentBooster: 3, // Ensure this is explicitly set to 3
          players: updatedPlayers,
        });
        setBoosterCards([]); // Clear booster cards when draft is complete
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

      // Fetch all 8 packs in PARALLEL for speed
      const packPromises = Array.from({ length: 8 }, () =>
        fetchPackAsCards(currentSet, true)
      );

      const packs = await Promise.all(packPromises);

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
      setAiPredictions(null); // Clear predictions for new pack
      lastPredictionPackKey.current = ''; // Reset so predictions can be fetched for new booster
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
      setAiPredictions(null); // Clear predictions after human pick
      lastPredictionPackKey.current = ''; // Reset so predictions can be fetched for next pack

      // Process bot picks and pass packs (this will update boosterCards with the new pack)
      await processRound();

      setIsTransitioning(false);
    }
  };

  // Sort picked cards by CMC for viewer (matches mana curve display order)
  const sortedPickedCards = React.useMemo(() => {
    return [...pickedCards].sort((a, b) => a.cmc - b.cmc);
  }, [pickedCards]);

  // Card viewer handlers
  const handleCardView = useCallback((card: Card) => {
    const index = sortedPickedCards.findIndex(c => c.id === card.id);
    if (index !== -1) {
      setViewedCardIndex(index);
    }
  }, [sortedPickedCards]);

  const handleCloseViewer = useCallback(() => {
    setViewedCardIndex(null);
  }, []);

  const handlePreviousCard = useCallback(() => {
    if (viewedCardIndex !== null && sortedPickedCards.length > 0) {
      // Wrap around: if at first card (0), go to last card
      const newIndex = viewedCardIndex === 0
        ? sortedPickedCards.length - 1
        : viewedCardIndex - 1;
      setViewedCardIndex(newIndex);
    }
  }, [viewedCardIndex, sortedPickedCards.length]);

  const handleNextCard = useCallback(() => {
    if (viewedCardIndex !== null && sortedPickedCards.length > 0) {
      // Wrap around: if at last card, go to first card (0)
      const newIndex = viewedCardIndex === sortedPickedCards.length - 1
        ? 0
        : viewedCardIndex + 1;
      setViewedCardIndex(newIndex);
    }
  }, [viewedCardIndex, sortedPickedCards.length]);

  const isPickReady = selectedCardId !== null;

  return (
    <>
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        activeTab="sets"
        boosterNumber={draftState?.currentBooster || 1}
        pickNumber={draftState?.currentPick || 1}
      />

      <div
        className="min-h-screen font-sans flex flex-col relative overflow-hidden"
        style={{
          background: 'radial-gradient(circle at top, #1a0a2e 0%, #0a0a0a 40%)',
        }}
      >


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

                {/* AI Prediction Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      AI Prediction
                    </label>
                    <p className="text-xs text-gray-500">
                      Show AI pick predictions
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAiPrediction}
                    className={`relative inline-flex flex-shrink-0 h-7 w-12 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 ${
                      isAiPredictionEnabled ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={isAiPredictionEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        isAiPredictionEnabled ? 'translate-x-5' : 'translate-x-0'
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
        ) : isDraftComplete ? (
          <DraftResults draftedCards={pickedCards} onRestartDraft={() => window.location.href = '/sets'} />
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
                    aiPredictions={isAiPredictionEnabled && selectedCardId ? aiPredictions : null}
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
              onCardClick={handleCardView}
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

        {/* Card Viewer Modal */}
        {viewedCardIndex !== null && sortedPickedCards[viewedCardIndex] && (
          <CardViewer
            card={sortedPickedCards[viewedCardIndex]}
            onClose={handleCloseViewer}
            onPrevious={handlePreviousCard}
            onNext={handleNextCard}
            canGoPrevious={sortedPickedCards.length > 1}
            canGoNext={sortedPickedCards.length > 1}
          />
        )}
      </div>
    </>
  );
}
