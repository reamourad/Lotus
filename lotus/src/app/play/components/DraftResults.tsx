'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DraftResultsProps {
  draftedCards: Card[];
  onRestartDraft: () => void;
}

interface ScryfallCardDetails extends Card {
  colors?: string[];
  type_line: string;
  rarity: string;
}

const COLORS: { [key: string]: string } = {
  W: '#f8f6d8',
  U: '#3b82f6',
  B: '#1f2937',
  R: '#ef4444',
  G: '#22c55e',
  M: '#9333ea', // Using purple for multicolor
  C: '#d1d5db',
};

const cardTypeEnum = {
    CREATURE: 'Creatures',
    INSTANT: 'Instants',
    SORCERY: 'Sorceries',
    ENCHANTMENT: 'Enchantments',
    ARTIFACT: 'Artifacts',
    PLANESWALKER: 'Planeswalkers',
    LAND: 'Lands',
} as const;

type CardType = typeof cardTypeEnum[keyof typeof cardTypeEnum];

const getCardCategory = (card: ScryfallCardDetails): CardType | null => {
    const typeLine = card.type_line;
    if (typeLine.includes('Creature')) return cardTypeEnum.CREATURE;
    if (typeLine.includes('Instant')) return cardTypeEnum.INSTANT;
    if (typeLine.includes('Sorcery')) return cardTypeEnum.SORCERY;
    if (typeLine.includes('Enchantment')) return cardTypeEnum.ENCHANTMENT;
    if (typeLine.includes('Artifact')) return cardTypeEnum.ARTIFACT;
    if (typeLine.includes('Planeswalker')) return cardTypeEnum.PLANESWALKER;
    if (typeLine.includes('Land')) return cardTypeEnum.LAND;
    return null;
};


const DraftResultsWithData: React.FC<DraftResultsProps> = ({ draftedCards, onRestartDraft }) => {
  const [detailedCards, setDetailedCards] = useState<ScryfallCardDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<CardType>(cardTypeEnum.CREATURE);

  useEffect(() => {
    const fetchAllCardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const promises = draftedCards.map(card =>
          fetch(`/api/scryfall?cardName=${encodeURIComponent(card.name)}&set=${card.set_code || ''}`)
            .then(res => {
              if (!res.ok) throw new Error(`Failed for ${card.name}`);
              return res.json();
            })
            .then(data => {
              // Preserve the original unique ID from our card object
              const originalId = card.id;
              return { ...card, ...data, id: originalId };
            })
        );
        const results = await Promise.all(promises);
        setDetailedCards(results);
      } catch (err) {
        setError('Failed to load some card details. The developer has been notified and is on high alert, maybe.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (draftedCards.length > 0) {
      fetchAllCardData();
    } else {
      setLoading(false);
    }
  }, [draftedCards]);

  const {stats, groupedCards} = useMemo(() => {
    if (detailedCards.length === 0) return {stats: null, groupedCards: {}};

    const colorCounts: { [key: string]: number } = { W: 0, U: 0, B: 0, R: 0, G: 0, M: 0, C: 0 };
    const manaCurve = new Array(7).fill(0); // 0-6, 7+
    
    const groupedCards: {[key: string]: ScryfallCardDetails[]} = {};
    (Object.values(cardTypeEnum)).forEach(type => {
        groupedCards[type] = [];
    });

    detailedCards.forEach(card => {
      if (!card.colors || card.colors.length === 0) {
        colorCounts.C++;
      } else if (card.colors.length > 1) {
        colorCounts.M++;
      } else {
        colorCounts[card.colors[0] as keyof typeof colorCounts]++;
      }

      const cmc = Math.min(card.cmc, 6);
      manaCurve[cmc]++;

      const category = getCardCategory(card);
      if(category){
        groupedCards[category].push(card);
      }
    });

    const colorData = Object.entries(colorCounts)
      .filter(([, count]) => count > 0)
      .map(([color, count]) => ({ name: color, value: count, color: COLORS[color] }));

    const manaCurveData = manaCurve.map((count, i) => ({
      cost: i === 6 ? '6+' : `${i}`,
      count,
    }));
    
    const totalCards = detailedCards.length;
    const creatureCount = groupedCards['Creatures'].length;
    const nonCreatureCount = totalCards - creatureCount;
    const avgCmc = (detailedCards.reduce((acc, card) => acc + card.cmc, 0) / totalCards).toFixed(1);

    return { stats: { colorData, manaCurveData, creatureCount, nonCreatureCount, totalCards, avgCmc }, groupedCards };
  }, [detailedCards]);

  const formatForArena = () => {
    const cardCounts = new Map<string, { card: Card; count: number }>();
    draftedCards.forEach((card) => {
      const existing = cardCounts.get(card.name);
      if (existing) existing.count++;
      else cardCounts.set(card.name, { card, count: 1 });
    });
    return Array.from(cardCounts.values())
      .map(({ card, count }) => `${count} ${card.name} (${(card.set_code || 'SET').toUpperCase()}) ${card.collector_number || '1'}`)
      .join('\n');
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatForArena());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading draft results...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-400">{error}</div>;
  }
  if (!stats) {
    return <div className="text-center py-10">No cards were drafted.</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-fade-in">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
            Draft Completed! - Review Dashboard
          </h1>
          <p className="text-gray-400 font-light text-lg">You drafted {stats.totalCards} cards.</p>
          
          <div className="flex items-center justify-center gap-4 mt-6 pt-2">
            <button onClick={handleCopyToClipboard} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-md font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95">
              {copySuccess ? "Copied!" : "Copy for Arena"}
            </button>
            <button onClick={onRestartDraft} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-2.5 rounded-md font-medium shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95">
              Start New Draft
            </button>
          </div>
        </div>

        <div className="space-y-2">
            <h2 className="text-lg font-medium text-white pl-1">Key Statistics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#161223] rounded-xl p-6 shadow-lg border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-6">Mana Curve</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.manaCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis 
                            dataKey="cost" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }} 
                            dy={10}
                            />
                            <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#9ca3af', fontSize: 12 }} 
                            />
                            <Tooltip
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#ffffff' }}
                            labelStyle={{ color: '#ffffff' }}
                            itemStyle={{ color: '#ffffff' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {stats.manaCurveData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#9333ea" />
                            ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 bg-[#1f1b2e] rounded py-2 px-4 text-center text-sm text-gray-300">
                        Average Mana Value: <span className="font-bold text-white">{stats.avgCmc}</span>
                    </div>
                </div>
                <div className="bg-[#161223] rounded-xl p-6 shadow-lg border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-2">Color Distribution</h3>
                    <div className="h-52 w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={stats.colorData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            labelLine={false}
                            >
                            {stats.colorData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                            <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#ffffff' }}
                            labelStyle={{ color: '#ffffff' }}
                            itemStyle={{ color: '#ffffff' }}
                            />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-2">
                        <div className="flex h-3 w-full rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-[#fcd34d]" style={{ width: `${(stats.creatureCount / stats.totalCards) * 100}%` }}></div>
                            <div className="h-full bg-[#f87171]" style={{ width: `${(stats.nonCreatureCount / stats.totalCards) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                            <span>Creatures: {stats.creatureCount}</span>
                            <span>Non-Creatures: {stats.nonCreatureCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">Drafted Card Pool</h2>
            <div className="flex border-b border-gray-700 mb-6 sticky top-0 bg-[#0f0b1a] z-10">
                {(Object.keys(groupedCards) as Array<string>).map((type) => {
                    if(groupedCards[type].length === 0) return null;
                    return (
                        <button
                            key={type}
                            onClick={() => setActiveTab(type as CardType)}
                            className={`
                            pb-3 px-6 text-sm font-medium transition-colors relative
                            ${activeTab === type ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                            `}
                        >
                            {type} ({groupedCards[type].length})
                            {activeTab === type && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
                {(groupedCards[activeTab] || []).map((card) => (
                <div 
                    key={card.id} 
                    className="group relative aspect-[5/7] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300 cursor-pointer"
                >
                    <img 
                    src={card.imageUrl} 
                    alt={card.name} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    />
                </div>
                ))}
            </div>
        </div>
    </div>
  );
};


export const DraftResults: React.FC<DraftResultsProps> = ({ draftedCards, onRestartDraft }) => {
  return (
    <div className="bg-[#0f0b1a] w-full">
        <DraftResultsWithData draftedCards={draftedCards} onRestartDraft={onRestartDraft} />
    </div>
  );
}