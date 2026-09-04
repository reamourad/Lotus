'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import { Card, HoverPosition, ModelInfo } from '../play/types';
import { DEFAULT_CARD_WIDTH, MAX_CARD_WIDTH, MIN_CARD_WIDTH } from '../play/utils/constants';
import { bestPerVersion, fetchModels, fetchPackAsCards, fetchPredictions } from '../play/utils/api';
import { BoosterGrid } from '../play/components/BoosterGrid';
import { CardHoverPreview } from '../play/components/CardHoverPreview';
import { CardViewer } from '../play/components/CardViewer';
import { ManaCurveDisplay } from '../play/components/ManaCurveDisplay';

const SET_CODE = 'HOB';
const PACKS_PER_DRAFT = 3;

const VERSION_LABELS: Record<string, string> = {
  v1_pointwise: 'v1',
  v2_value_head: 'v2',
  v3_graph: 'v3',
};

const VERSION_BLURBS: Record<string, string> = {
  v1_pointwise: 'Sentence embedding of the rules text',
  v2_value_head: 'Adds a win-rate head over the pool',
  v3_graph: 'Reads a parsed graph of the rules text',
};

const labelFor = (version: string) => VERSION_LABELS[version] ?? version.replace(/_/g, ' ');

type Prediction = { card_name: string; probability: number };

interface ModelState {
  model: ModelInfo;
  predictions: Prediction[] | null;
  loading: boolean;
  error: string | null;
}

export default function HobbitComparisonPage() {
  const [modelStates, setModelStates] = useState<ModelState[]>([]);
  const [pack, setPack] = useState<Card[]>([]);
  const [pool, setPool] = useState<Card[]>([]);
  const [packNumber, setPackNumber] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{ card: Card; position: HoverPosition } | null>(null);
  const [viewedCardIndex, setViewedCardIndex] = useState<number | null>(null);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which model's numbers sit on the cards. Clicking a model's box switches to
  // it; clicking the selected one again clears the overlay.
  const [shownModelId, setShownModelId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const models = useMemo(() => modelStates.map(state => state.model), [modelStates]);
  const shownState = modelStates.find(state => state.model.model_id === shownModelId) ?? null;

  const loadPack = useCallback(async () => {
    const cards = await fetchPackAsCards(SET_CODE);
    setPack(cards);
    setSelectedCardId(null);
    return cards;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { models: loaded } = await fetchModels();
        const chosen = bestPerVersion(loaded);
        if (cancelled) return;
        if (chosen.length === 0) {
          setError('No trained models are available right now.');
          setLoading(false);
          return;
        }
        setModelStates(chosen.map(model => ({ model, predictions: null, loading: true, error: null })));
        setShownModelId(chosen[0].model_id);
        await loadPack();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to start the comparison.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadPack]);

  // Every model ranks the same pack against the same pool, in parallel.
  useEffect(() => {
    if (pack.length === 0 || models.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const packNames = pack.map(c => c.name);
    const poolNames = pool.map(c => c.name);

    setModelStates(previous => previous.map(state => ({ ...state, loading: true, error: null })));

    models.forEach((model) => {
      fetchPredictions(SET_CODE, packNames, poolNames, model.model_id, controller.signal)
        .then((predictions) => {
          if (controller.signal.aborted) return;
          setModelStates(previous => previous.map(state => (
            state.model.model_id === model.model_id
              ? { ...state, predictions, loading: false, error: null }
              : state
          )));
        })
        .catch((e) => {
          if (controller.signal.aborted || e?.name === 'AbortError') return;
          setModelStates(previous => previous.map(state => (
            state.model.model_id === model.model_id
              ? { ...state, predictions: null, loading: false, error: 'no answer' }
              : state
          )));
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, pool, models.length]);

  const handleCardSelection = (card: Card) => {
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  const handleCardHover = useCallback((card: Card, rect: DOMRect) => {
    setHoveredCard({ card, position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredCard(null), []);

  const handleConfirmPick = async () => {
    const card = pack.find(c => c.id === selectedCardId);
    if (!card) return;

    const remaining = pack.filter(c => c.id !== card.id);
    setPool(previous => [...previous, card]);
    setHoveredCard(null);
    setSelectedCardId(null);

    if (remaining.length > 0) {
      setPack(remaining);
      return;
    }
    if (packNumber >= PACKS_PER_DRAFT) {
      setPack([]);
      return;
    }
    setPackNumber(n => n + 1);
    setLoading(true);
    try {
      await loadPack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open the next pack.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setPool([]);
    setPackNumber(1);
    setSelectedCardId(null);
    setError(null);
    setLoading(true);
    try {
      await loadPack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open a new pack.');
    } finally {
      setLoading(false);
    }
  };

  const sortedPool = useMemo(() => [...pool].sort((a, b) => a.cmc - b.cmc), [pool]);

  const handleCardView = useCallback((card: Card) => {
    const index = sortedPool.findIndex(c => c.id === card.id);
    if (index !== -1) setViewedCardIndex(index);
  }, [sortedPool]);

  const handlePreviousCard = useCallback(() => {
    if (viewedCardIndex !== null && sortedPool.length > 0) {
      setViewedCardIndex(viewedCardIndex === 0 ? sortedPool.length - 1 : viewedCardIndex - 1);
    }
  }, [viewedCardIndex, sortedPool.length]);

  const handleNextCard = useCallback(() => {
    if (viewedCardIndex !== null && sortedPool.length > 0) {
      setViewedCardIndex(viewedCardIndex === sortedPool.length - 1 ? 0 : viewedCardIndex + 1);
    }
  }, [viewedCardIndex, sortedPool.length]);

  const topPicks = modelStates
    .map(state => state.predictions?.[0]?.card_name)
    .filter((name): name is string => Boolean(name));
  const distinctTopPicks = Array.from(new Set(topPicks));
  const draftComplete = pack.length === 0 && !loading && pool.length > 0;
  const isPickReady = selectedCardId !== null;

  return (
    <>
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        activeTab="hobbit"
        boosterNumber={packNumber}
        pickNumber={(pool.length % 14) + 1}
      />

      <div
        className="min-h-screen font-sans flex flex-col relative overflow-hidden"
        style={{ background: 'radial-gradient(circle at top, #1a0a2e 0%, #0a0a0a 40%)' }}
      >
        <main className="px-4 md:px-8 pt-2 pb-4 flex-grow relative z-10">
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Settings</h2>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    aria-label="Close Settings"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Card Size</label>
                  <input
                    type="range"
                    min={MIN_CARD_WIDTH}
                    max={MAX_CARD_WIDTH}
                    value={cardWidth}
                    onChange={(e) => setCardWidth(Number(e.target.value))}
                    className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                    style={{
                      background: `linear-gradient(to right, #9333ea 0%, #9333ea ${((cardWidth - MIN_CARD_WIDTH) / (MAX_CARD_WIDTH - MIN_CARD_WIDTH)) * 100}%, #4b5563 ${((cardWidth - MIN_CARD_WIDTH) / (MAX_CARD_WIDTH - MIN_CARD_WIDTH)) * 100}%, #4b5563 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">The Hobbit — model comparison</h1>
              <p className="mt-1 text-sm text-gray-400">
                Every model ranks the same pack against the same pool. Click a model to put its numbers on the cards.
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="rounded-full border border-gray-600 px-5 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-purple-500 hover:text-white"
            >
              New draft
            </button>
          </div>

          {/* One box per model, and the box is the control for whose numbers show */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modelStates.map((state) => {
              const top = state.predictions?.[0];
              const holdout = state.model.metrics?.holdout?.top_1_accuracy;
              const isShown = state.model.model_id === shownModelId;
              return (
                <button
                  key={state.model.model_id}
                  type="button"
                  onClick={() => setShownModelId(isShown ? null : state.model.model_id)}
                  aria-pressed={isShown}
                  className={`rounded-xl border bg-gray-900/70 p-4 text-left transition-all ${
                    isShown
                      ? 'border-purple-500 shadow-lg shadow-purple-500/30'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-white">{labelFor(state.model.version)}</span>
                    {typeof holdout === 'number' && (
                      <span className="text-xs text-gray-400">{(holdout * 100).toFixed(1)}% on an unseen set</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {VERSION_BLURBS[state.model.version] ?? state.model.description}
                  </p>
                  <div className="mt-3 min-h-[3.25rem]">
                    {state.loading && <p className="text-sm text-gray-500">thinking…</p>}
                    {!state.loading && state.error && <p className="text-sm text-red-300">{state.error}</p>}
                    {!state.loading && !state.error && top && (
                      <>
                        <p className="text-base text-gray-100">{top.card_name}</p>
                        <p className="font-mono text-xs text-gray-400">{(top.probability * 100).toFixed(1)}%</p>
                      </>
                    )}
                    {!state.loading && !state.error && !top && pack.length > 0 && (
                      <p className="text-sm text-gray-500">no pick</p>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {isShown ? 'Showing its numbers on the pack' : 'Click to show its numbers'}
                  </p>
                </button>
              );
            })}
            {modelStates.length > 0 && modelStates.length < 3 && (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-4">
                <span className="text-lg font-bold text-gray-600">v2</span>
                <p className="mt-1 text-xs text-gray-600">
                  Still training. It appears here on its own once the run finishes.
                </p>
              </div>
            )}
          </div>

          {distinctTopPicks.length > 0 && (
            <p className="mb-2 text-sm text-gray-400">
              {distinctTopPicks.length === 1
                ? `All models want ${distinctTopPicks[0]}.`
                : `The models disagree: ${distinctTopPicks.join(', ')}.`}
            </p>
          )}

          {error ? (
            <div className="text-center text-red-500">
              <h2 className="mt-10 text-2xl font-bold">Error Loading Data</h2>
              <p>{error}</p>
            </div>
          ) : draftComplete ? (
            <div className="mt-10 text-center">
              <p className="text-xl text-white">Draft finished with {pool.length} cards.</p>
              <button
                onClick={handleRestart}
                className="mt-4 rounded-full bg-purple-600 px-8 py-3 font-extrabold tracking-wider text-white shadow-lg shadow-purple-500/50 transition-all hover:bg-purple-700"
              >
                DRAFT AGAIN
              </button>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex h-64 items-center justify-center text-xl text-purple-400">
                  <div className="animate-pulse">Opening Booster Pack...</div>
                </div>
              ) : (
                <>
                  <BoosterGrid
                    cards={pack}
                    selectedCardId={selectedCardId}
                    onCardClick={handleCardSelection}
                    onCardHover={handleCardHover}
                    onMouseLeave={handleMouseLeave}
                    isHoverEnabled
                    cardWidth={cardWidth}
                    aiPredictions={shownState?.predictions ?? null}
                  />

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleConfirmPick}
                      className={`rounded-full px-8 py-3 font-extrabold tracking-wider text-white shadow-lg transition-all ${
                        isPickReady
                          ? 'bg-purple-600 shadow-purple-500/50 hover:bg-purple-700'
                          : 'cursor-not-allowed bg-gray-700 text-gray-400'
                      }`}
                      disabled={!isPickReady}
                    >
                      CONFIRM PICK
                    </button>
                  </div>
                </>
              )}

              <hr
                className="my-8 -mx-4 border-yellow-500 md:-mx-8"
                style={{
                  borderWidth: '4px',
                  boxShadow: '0 -8px 16px rgba(234, 179, 8, 0.5), 0 -4px 8px rgba(234, 179, 8, 0.3), 0 -2px 4px rgba(234, 179, 8, 0.2)',
                }}
              />

              <ManaCurveDisplay
                draftedCards={pool}
                onReorder={setPool}
                cardWidth={cardWidth}
                onCardClick={handleCardView}
              />
            </>
          )}
        </main>

        {hoveredCard && (
          <CardHoverPreview card={hoveredCard.card} cardPosition={hoveredCard.position} />
        )}

        {viewedCardIndex !== null && sortedPool[viewedCardIndex] && (
          <CardViewer
            card={sortedPool[viewedCardIndex]}
            onClose={() => setViewedCardIndex(null)}
            onPrevious={handlePreviousCard}
            onNext={handleNextCard}
            canGoPrevious={sortedPool.length > 1}
            canGoNext={sortedPool.length > 1}
          />
        )}
      </div>
    </>
  );
}
