'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@lemonsqueezy/wedges';

interface Set {
  code: string;
  name: string;
  has_model: boolean;
  has_icon: boolean;
}

interface SetsResponse {
  sets: Set[];
  count: number;
}

export default function SetsPage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      const response = await fetch('/api/sets', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch sets');
      }
      const data: SetsResponse = await response.json();
      setSets(data.sets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sets');
    } finally {
      setLoading(false);
    }
  };

  const handleSetSelect = (setCode: string, hasModel: boolean) => {
    // Store selected set in localStorage (convert to lowercase as API expects it)
    localStorage.setItem('selectedSet', setCode.toLowerCase());
    // Store has_model status
    localStorage.setItem('selectedSetHasModel', hasModel.toString());
    // Navigate to play page
    router.push('/play');
  };

  if (loading) {
    return (
      <>
        <Header activeTab="sets" />
        <main className="min-h-screen bg-lotus-bg">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center py-20">
              <div className="text-white text-xl">Loading sets...</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header activeTab="sets" />
        <main className="min-h-screen bg-lotus-bg">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center py-20">
              <div className="text-red-500 text-xl">{error}</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header activeTab="sets" />
      <div className="min-h-screen font-sans flex flex-col relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
        {/* Background gradient image - positioned at bottom */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none overflow-hidden">
          <img
            src="/gradient.png"
            alt="Background gradient"
            className="w-full h-[60vh] object-fill opacity-20"
          />
        </div>

        <main className="flex-grow relative z-10 flex flex-col items-center justify-center px-4 py-8">
          <div className="flex flex-wrap justify-center gap-6">
            {sets.map((set) => (
              <div key={set.code} className="relative">
                <Button
                  onClick={() => handleSetSelect(set.code, set.has_model)}
                  variant="tertiary"
                  className="!p-1"
                >
                  {set.has_icon ? (
                    <img
                      src={`/api/sets/${set.code}/icon`}
                      alt={set.name}
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="text-gray-500 text-4xl font-bold w-48 h-48 flex items-center justify-center">
                      {set.code}
                    </div>
                  )}
                </Button>
                {!set.has_model && (
                  <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded">
                    BETA
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
