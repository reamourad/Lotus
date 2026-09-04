'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import { Card, ModelInfo } from '../play/types';
import {
  bestPerVersion,
  fetchModels,
  fetchPackAsCards,
  fetchPredictions,
  getScryfallImageUrl,
} from '../play/utils/api';

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

// One colour per model so a card's badges and its column read as the same thing.
const VERSION_COLORS: Record<string, { text: string; badge: string; ring: string }> = {
  v1_pointwise: { text: 'text-sky-300', badge: 'bg-sky-500/90 text-sky-950', ring: 'ring-sky-400' },
  v2_value_head: { text: 'text-amber-300', badge: 'bg-amber-500/90 text-amber-950', ring: 'ring-amber-400' },
  v3_graph: { text: 'text-emerald-300', badge: 'bg-emerald-500/90 text-emerald-950', ring: 'ring-emerald-400' },
};

const FALLBACK_COLORS = { text: 'text-gray-300', badge: 'bg-gray-500/90 text-gray-950', ring: 'ring-gray-400' };
const colorsFor = (version: string) => VERSION_COLORS[version] ?? FALLBACK_COLORS;
const labelFor = (version: string) => VERSION_LABELS[version] ?? version.replace(/_/g, ' ');

type Ranking = Map<string, { rank: number; probability: number }>;

interface ModelState {
  model: ModelInfo;
  ranking: Ranking | null;
  loading: boolean;
  error: string | null;
}

const rankingFrom = (predictions: Array<{ card_name: string; probability: number }>): Ranking => {
  const ranking: Ranking = new Map();
  predictions.forEach((prediction, index) => {
    // A pack can hold two copies of a card; the first entry is the better rank.
    if (!ranking.has(prediction.card_name)) {
      ranking.set(prediction.card_name, { rank: index + 1, probability: prediction.probability });
    }
  });
  return ranking;
};

export default function HobbitComparisonPage() {
  const [modelStates, setModelStates] = useState<ModelState[]>([]);
  const [pack, setPack] = useState<Card[]>([]);
  const [pool, setPool] = useState<Card[]>([]);
  const [packNumber, setPackNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const models = useMemo(() => modelStates.map(state => state.model), [modelStates]);

  const loadPack = useCallback(async () => {
    const cards = await fetchPackAsCards(SET_CODE);
    setPack(cards);
    return cards;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ models: loaded }] = await Promise.all([fetchModels(), Promise.resolve()]);
        const chosen = bestPerVersion(loaded);
        if (cancelled) return;
        if (chosen.length === 0) {
          setError('No trained models are available right now.');
          setLoading(false);
          return;
        }
        setModelStates(chosen.map(model => ({ model, ranking: null, loading: true, error: null })));
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
              ? { ...state, ranking: rankingFrom(predictions), loading: false, error: null }
              : state
          )));
        })
        .catch((e) => {
          if (controller.signal.aborted || e?.name === 'AbortError') return;
          setModelStates(previous => previous.map(state => (
            state.model.model_id === model.model_id
              ? { ...state, ranking: null, loading: false, error: 'no answer' }
              : state
          )));
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, pool, models.length]);

  const handlePick = async (card: Card) => {
    const remaining = pack.filter(c => c.id !== card.id);
    setPool(previous => [...previous, card]);
    setHoveredCard(null);
    if (remaining.length === 0) {
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
      return;
    }
    setPack(remaining);
  };

  const handleRestart = async () => {
    setPool([]);
    setPackNumber(1);
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

  const topPickOf = (state: ModelState): { card: Card; probability: number } | null => {
    if (!state.ranking) return null;
    let best: { card: Card; probability: number } | null = null;
    pack.forEach((card) => {
      const entry = state.ranking!.get(card.name);
      if (entry && entry.rank === 1) best = { card, probability: entry.probability };
    });
    return best;
  };

  const topPicks = modelStates.map(topPickOf);
  const namedTopPicks = topPicks.filter(Boolean).map(p => p!.card.name);
  const allAgree = namedTopPicks.length > 1 && new Set(namedTopPicks).size === 1;
  const draftComplete = pack.length === 0 && !loading && pool.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header activeTab="hobbit" boosterNumber={packNumber} pickNumber={pool.length % 14 + 1} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium">The Hobbit — model comparison</h1>
            <p className="mt-1 text-sm text-gray-400">
              Every model ranks the same pack against the same pool. Pick a card to move the draft on
              and watch where they disagree.
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 transition-colors hover:border-gray-400 hover:bg-gray-800"
          >
            New draft
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* One column per model: its top pick, its confidence, and how it scored */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modelStates.map((state) => {
            const colors = colorsFor(state.model.version);
            const top = topPickOf(state);
            const holdout = state.model.metrics?.holdout?.top_1_accuracy;
            return (
              <div key={state.model.model_id} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                <div className="flex items-baseline justify-between">
                  <span className={`text-lg font-medium ${colors.text}`}>{labelFor(state.model.version)}</span>
                  {typeof holdout === 'number' && (
                    <span className="text-xs text-gray-400">{(holdout * 100).toFixed(1)}% on an unseen set</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {VERSION_BLURBS[state.model.version] ?? state.model.description}
                </p>
                <div className="mt-3 min-h-[3.5rem]">
                  {state.loading && <p className="text-sm text-gray-500">thinking…</p>}
                  {!state.loading && state.error && <p className="text-sm text-red-300">{state.error}</p>}
                  {!state.loading && !state.error && top && (
                    <>
                      <p className="text-base text-gray-100">{top.card.name}</p>
                      <p className="text-xs text-gray-400">{(top.probability * 100).toFixed(1)}% confidence</p>
                    </>
                  )}
                  {!state.loading && !state.error && !top && pack.length > 0 && (
                    <p className="text-sm text-gray-500">no pick</p>
                  )}
                </div>
              </div>
            );
          })}
          {modelStates.length < 3 && (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-4">
              <span className="text-lg font-medium text-gray-500">v2</span>
              <p className="mt-1 text-xs text-gray-600">
                Still training. It appears here on its own once the run finishes.
              </p>
            </div>
          )}
        </div>

        {namedTopPicks.length > 1 && (
          <p className="mb-4 text-sm text-gray-400">
            {allAgree
              ? 'All models want the same card here.'
              : `The models disagree: ${Array.from(new Set(namedTopPicks)).join(', ')}.`}
          </p>
        )}

        {loading && <p className="text-sm text-gray-500">Opening a pack…</p>}

        {draftComplete && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6 text-center">
            <p className="text-lg">Draft finished with {pool.length} cards.</p>
            <button
              onClick={handleRestart}
              className="mt-4 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
            >
              Draft again
            </button>
          </div>
        )}

        {/* The pack. Each card carries one badge per model showing that model's rank for it. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {pack.map((card) => {
            const badges = modelStates
              .map(state => ({ state, entry: state.ranking?.get(card.name) }))
              .filter(item => item.entry);
            const isAnyTop = badges.some(item => item.entry!.rank === 1);
            return (
              <button
                key={card.id}
                onClick={() => handlePick(card)}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative overflow-hidden rounded-lg border transition-transform hover:scale-105 ${
                  isAnyTop ? 'border-gray-400' : 'border-gray-700'
                }`}
                title={`Pick ${card.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getScryfallImageUrl(card.name)}
                  alt={card.name}
                  loading="lazy"
                  className="aspect-[5/7] w-full object-cover"
                />
                {/* Badges sit along the bottom so they never cover the card's
                    own name, mana cost or art. */}
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 bg-gray-950/80 px-1 py-1">
                  {badges.map(({ state, entry }) => (
                    <span
                      key={state.model.model_id}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colorsFor(state.model.version).badge}`}
                      title={`${labelFor(state.model.version)} ranks this #${entry!.rank} at ${(entry!.probability * 100).toFixed(1)}%`}
                    >
                      {labelFor(state.model.version)} #{entry!.rank}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {hoveredCard && (
          <p className="mt-3 text-sm text-gray-400">{hoveredCard.name}</p>
        )}

        {pool.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-medium">Your pool ({pool.length})</h2>
            <div className="flex flex-wrap gap-2">
              {pool.map(card => (
                <span key={card.id} className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
                  {card.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
