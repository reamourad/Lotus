"use client";

import { useState, useEffect } from "react";
import { Button } from "@lemonsqueezy/wedges";
import { RefreshCw } from "lucide-react";

interface BoosterPackData {
    pack: number[];
}

interface CardImage {
    id: number;
    name: string;
    imageUrl: string | null;
    status: 'loading' | 'success' | 'error';
    error?: string;
    isRecommended?: boolean;
    probability?: number;
}

interface PredictionData {
    card_id: number;
    card_name: string;
    probability: number;
}

const SET_CODE = 'mh3';

export default function BoosterPack() {
    const [pack, setPack] = useState<number[] | null>(null);
    const [cardImages, setCardImages] = useState<CardImage[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<string>("");
    const [recommendedCardId, setRecommendedCardId] = useState<number | null>(null);
    const [predictions, setPredictions] = useState<PredictionData[]>([]);

    const fetchPrediction = async (packIds: number[]): Promise<{ recommendedId: number | null, allPredictions: PredictionData[] }> => {
        try {
            console.log("[PREDICT] Calling prediction API with pack:", packIds);

            const response = await fetch("https://mtgdraftassistant.onrender.com/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    deck: [], // Empty deck for now
                    pack: packIds
                })
            });

            if (!response.ok) {
                throw new Error(`Prediction API error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("[PREDICT] Prediction response:", data);

            // Store all predictions
            if (data.prediction && Array.isArray(data.prediction) && data.prediction.length > 0) {
                const topPick = data.prediction[0];
                console.log(`[PREDICT] AI recommends: ${topPick.card_name} (ID: ${topPick.card_id}) with ${(topPick.probability * 100).toFixed(2)}% confidence`);
                return {
                    recommendedId: topPick.card_id,
                    allPredictions: data.prediction
                };
            }

            return { recommendedId: null, allPredictions: [] };
        } catch (err) {
            console.error("Error fetching prediction:", err);
            return { recommendedId: null, allPredictions: [] };
        }
    };

    const fetchCardImage = async (cardName: string, collectorId: number): Promise<string> => {
        // Use Scryfall's named card search with set filter
        const scryfallEndpoint = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${SET_CODE}`;
        console.log(`[NETWORK] Fetching Scryfall data for "${cardName}" from ${SET_CODE.toUpperCase()}`);

        const response = await fetch(scryfallEndpoint);

        if (!response.ok) {
            throw new Error(`Scryfall Error: Status ${response.status} for "${cardName}"`);
        }

        const cardData = await response.json();

        const imageUrl = cardData.image_uris?.normal ||
            cardData.card_faces?.[0]?.image_uris?.normal;

        if (!imageUrl) {
            console.error("Card data:", cardData);
            throw new Error(`No 'normal' image URL found for "${cardName}"`);
        }

        return imageUrl;
    };

    const fetchBoosterPack = async () => {
        setLoading(true);
        setError(null);
        setLoadingStatus("Step 1: Contacting Booster API...");
        setCardImages([]); // Clear previous cards
        setPredictions([]); // Clear previous predictions
        setRecommendedCardId(null); // Clear previous recommendation

        try {
            const response = await fetch("https://mtgdraftassistant.onrender.com/booster");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: BoosterPackData = await response.json();

            if (!data.pack || !Array.isArray(data.pack)) {
                throw new Error("API response is missing the 'pack' array");
            }

            console.log("Booster Pack:", data.pack);
            setPack(data.pack);

            setLoadingStatus(`Step 2: Getting AI recommendation...`);

            // Fetch AI prediction and get predictions directly
            const { recommendedId, allPredictions } = await fetchPrediction(data.pack);
            setRecommendedCardId(recommendedId);
            setPredictions(allPredictions);

            setLoadingStatus(`Step 3: Fetching card images from Scryfall...`);

            // Initialize card images with loading state and card names
            const initialImages: CardImage[] = data.pack.map(id => {
                const predictionData = allPredictions.find(p => p.card_id === id);
                return {
                    id,
                    name: predictionData?.card_name || `Card ${id}`,
                    imageUrl: null,
                    status: 'loading'
                };
            });
            setCardImages(initialImages);

            // Fetch all card images using card names
            const results = await Promise.allSettled(
                data.pack.map(id => {
                    const predictionData = allPredictions.find(p => p.card_id === id);
                    const cardName = predictionData?.card_name || '';
                    return fetchCardImage(cardName, id);
                })
            );

            let successfulLoads = 0;

            // Map through pack IDs to ensure we have all predictions
            const updatedImages: CardImage[] = data.pack.map((collectorId, index) => {
                const result = results[index];
                const isRecommended = collectorId === recommendedId;

                // Find prediction data for this card
                const predictionData = allPredictions.find(p => p.card_id === collectorId);
                const probability = predictionData?.probability;
                const cardName = predictionData?.card_name || `Card ${collectorId}`;

                console.log(`Card ID ${collectorId} (${cardName}): probability = ${probability ? (probability * 100).toFixed(2) + '%' : 'not found'}`);

                if (result.status === 'fulfilled') {
                    successfulLoads++;
                    console.log(`[IMAGE URL] "${cardName}" (ID ${collectorId}) URL: ${result.value}`);
                    return {
                        id: collectorId,
                        name: cardName,
                        imageUrl: result.value,
                        status: 'success',
                        isRecommended,
                        probability
                    };
                } else {
                    console.error(`Failed to fetch Scryfall data for "${cardName}" (ID ${collectorId}):`, result.reason);
                    return {
                        id: collectorId,
                        name: cardName,
                        imageUrl: null,
                        status: 'error',
                        error: result.reason.message,
                        isRecommended,
                        probability
                    };
                }
            });

            setCardImages(updatedImages);

            const recommendText = recommendedId
                ? ` AI recommends card ID ${recommendedId}.`
                : "";

            setLoadingStatus(`✅ Pack loading complete: ${successfulLoads} images loaded out of ${data.pack.length} cards from set ${SET_CODE.toUpperCase()}.${recommendText}`);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch booster pack");
            console.error("Error fetching booster pack:", err);
        } finally {
            setLoading(false);
        }
    };

    const getProbabilityColor = (probability?: number): string => {
        if (!probability) return 'text-gray-400';

        const percent = probability * 100;
        if (percent < 20) return 'text-red-500';
        if (percent < 60) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getProbabilityBgColor = (probability?: number): string => {
        if (!probability) return 'bg-gray-500/20';

        const percent = probability * 100;
        if (percent < 20) return 'bg-red-500/20';
        if (percent < 60) return 'bg-yellow-500/20';
        return 'bg-green-500/20';
    };

    useEffect(() => {
        fetchBoosterPack();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <style jsx>{`
        @keyframes pulse-red {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .pulse-red {
          animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-semibold text-white">Booster Pack</h2>
                    <Button
                        before={<RefreshCw />}
                        onClick={fetchBoosterPack}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Get New Pack"}
                    </Button>
                </div>

                {loadingStatus && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg text-blue-400">
                        {loadingStatus}
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                        <div className="font-semibold text-red-400 mb-1">Error</div>
                        <div className="text-red-300">{error}</div>
                    </div>
                )}

                {cardImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {cardImages.map((card) => (
                            <div key={`card-${card.id}`} className="relative group">
                                <div className={`aspect-[5/7] rounded-lg overflow-hidden bg-white/5 ${
                                    card.isRecommended
                                        ? 'border-4 border-purple-500 shadow-lg shadow-purple-500/50'
                                        : 'border border-white/10'
                                }`}>
                                    {card.status === 'loading' && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-gray-400 text-sm">Loading...</div>
                                        </div>
                                    )}

                                    {card.status === 'success' && card.imageUrl && (
                                        <img
                                            src={card.imageUrl}
                                            alt={card.name}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                            onError={(e) => {
                                                console.error(`Image render failed for "${card.name}" (ID ${card.id})`);
                                                e.currentTarget.src = `https://placehold.co/250x350/FF6347/FFFFFF?text=Image+Load+Error%0A${encodeURIComponent(card.name)}`;
                                            }}
                                        />
                                    )}

                                    {card.status === 'error' && (
                                        <img
                                            src={`https://placehold.co/250x350/333333/FFFFFF?text=Card+Not+Found%0A${encodeURIComponent(card.name)}`}
                                            alt={`${card.name} not found`}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                {/* Probability indicator */}
                                {card.probability !== undefined && (
                                    <div className={`absolute bottom-2 left-2 right-2 ${getProbabilityBgColor(card.probability)} backdrop-blur-sm rounded px-2 py-1`}>
                                        <div className={`text-xs font-bold text-center ${getProbabilityColor(card.probability)} ${
                                            card.probability && card.probability * 100 < 20 ? 'pulse-red' : ''
                                        }`}>
                                            {(card.probability * 100).toFixed(1)}% (ID: {card.id})
                                        </div>
                                    </div>
                                )}

                                {/* Card ID tooltip on hover */}
                                <div className="absolute top-2 left-2 right-2 bg-black/80 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {card.name}
                                    {card.isRecommended && <span className="ml-2 text-purple-400">⭐ AI Pick</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {loading && cardImages.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">Loading booster pack...</div>
                    </div>
                )}
            </div>
        </div>
    );
}