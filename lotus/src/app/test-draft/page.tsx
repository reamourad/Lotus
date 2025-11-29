'use client';

import React, { useState, useEffect } from 'react';
import { DraftResults } from '../play/components/DraftResults';
import { Card } from '../play/types';
import Header from '@/components/Header';

const testCardList = `
2 Charitable Levy (MH3) 21
1 Nesting Grounds (MH3) 302
1 Retrofitted Transmogrant (MH3) 106
1 Mandibular Kite (MH3) 34
2 Colossal Dreadmask (MH3) 148
1 Tranquil Landscape (MH3) 231
2 Molten Gatekeeper (MH3) 128
1 Twisted Landscape (MH3) 232
1 Collective Resistance (MH3) 147
1 Plains (TLA) 282
1 Muster the Departed (MH3) 36
1 Dreamdrinker Vampire (MH3) 88
2 Island (TLA) 283
1 Refurbished Familiar (MH3) 105
1 Nyxborn Unicorn (MH3) 37
1 Sheltering Landscape (MH3) 227
1 Faithful Watchdog (MH3) 185
2 Infernal Captor (MH3) 125
2 Solstice Zealot (MH3) 43
1 Eviscerator's Insight (MH3) 93
2 Mountain (TLA) 285
1 Siege Smash (MH3) 136
1 Obstinate Gargoyle (MH3) 195
1 Eldrazi Repurposer (MH3) 150
1 Fanged Flames (MH3) 118
2 Seething Landscape (MH3) 225
1 Deem Inferior (MH3) 57
1 Drownyard Lurker (MH3) 3
1 Temperamental Oozewagg (MH3) 172
1 Fowl Strike (MH3) 155
1 Tamiyo Meets the Story Circle (MH3) 72
1 Snow-Covered Wastes (MH3) 229
1 Cephalid Coliseum (TDC) 349
1 Jolted Awake (MH3) 33
`;

const parseCardList = (list: string): Partial<Card>[] => {
  const lines = list.trim().split('\n');
  const cards: Partial<Card>[] = [];
  lines.forEach(line => {
    const match = line.match(/(\d+)\s+(.+?)\s+\((\w+)\)\s+(\d+)/);
    if (match) {
      const [, count, name, set_code, collector_number] = match;
      for (let i = 0; i < parseInt(count); i++) {
        cards.push({
          id: `${name}-${set_code}-${collector_number}-${i}`,
          name,
          set_code,
          collector_number,
        });
      }
    }
  });
  return cards;
};


const TestDraftPage: React.FC = () => {
    const [draftedCards, setDraftedCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCardData = async () => {
            const parsedCards = parseCardList(testCardList);
            const promises = parsedCards.map(card => 
                fetch(`/api/scryfall?cardName=${encodeURIComponent(card.name!)}&set=${card.set_code || ''}`)
                .then(res => res.json())
                .then(data => ({
                    ...card,
                    imageUrl: data.image_uris?.normal || '',
                    cmc: data.cmc || 0,
                } as Card))
            );
            const results = await Promise.all(promises);
            setDraftedCards(results);
            setLoading(false);
        };

        fetchCardData();
    }, []);

    if (loading) {
        return <div className="text-center py-10">Loading test draft...</div>;
    }

    return (
        <div className="bg-[#0f0b1a]">
            <Header onSettingsClick={() => {}} activeTab="play" />
            <DraftResults draftedCards={draftedCards} onRestartDraft={() => {
                window.location.href = '/sets';
            }} />
        </div>
    );
};

export default TestDraftPage;
