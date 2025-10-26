"use client";

import { useState } from "react";
import { Button } from "@lemonsqueezy/wedges";
import { Play, RotateCcw, ChevronRight } from "lucide-react";

interface Card {
    id: number;
    name: string;
    imageUrl?: string;
    probability?: number;
    isRecommended?: boolean;
}

interface Player {
    id: number;
    name: string;
    deck: Card[];
}

interface DraftState {
    currentBooster: number;
    currentPick: number;
    currentPack: Card[];
    allPacks: Card[][]; // Track all packs in circulation
    mainPlayer: Player;
    otherPlayers: Player[];
    isActive: boolean;
    isDrafting: boolean;
    draftComplete: boolean;
}

const SET_CODE = 'mh3';

export default function AIDraftSimulator() {
    const [draftState, setDraftState] = useState<DraftState>({
        currentBooster: 1,
        currentPick: 1,
        currentPack: [],
        allPacks: [],
        mainPlayer: { id: 1, name: "AI Player 1 (You)", deck: [] },
        otherPlayers: Array.from({ length: 7 }, (_, i) => ({
            id: i + 2,
            name: `AI Player ${i + 2}`,
            deck: [],
        })),
        isActive: false,
        isDrafting: false,
        draftComplete: false,
    });

    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    // Fetch a booster pack from the API
    const fetchBoosterPack = async (): Promise<number[]> => {
        console.log("[BOOSTER] Fetching new booster pack...");
        const response = await fetch("https://mtgdraftassistant.onrender.com/booster");
        if (!response.ok) {
            throw new Error(`Failed to fetch booster: ${response.status}`);
        }
        const data = await response.json();
        console.log("[BOOSTER] Received pack:", data.pack);
        return data.pack;
    };

    // Fetch AI prediction for the main player
    const fetchAIPrediction = async (packIds: number[], deckIds: number[]): Promise<{ recommendedId: number, allPredictions: any[] }> => {
        console.log("[PREDICT] Calling prediction API");
        console.log("[PREDICT] Pack IDs:", packIds);
        console.log("[PREDICT] Deck IDs:", deckIds);
        console.log("[PREDICT] Deck size:", deckIds.length);

        const requestBody = { deck: deckIds, pack: packIds };
        console.log("[PREDICT] Request body:", JSON.stringify(requestBody));

        const response = await fetch("https://mtgdraftassistant.onrender.com/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error("[PREDICT] API error! Status:", response.status);
            throw new Error(`Prediction failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("[PREDICT] Full prediction response:", data);

        if (data.prediction && Array.isArray(data.prediction) && data.prediction.length > 0) {
            const topPick = data.prediction[0];
            console.log(`[PREDICT] ✅ AI recommends: ${topPick.card_name} (ID: ${topPick.card_id}) with ${(topPick.probability * 100).toFixed(2)}% confidence`);
            console.log("[PREDICT] All predictions count:", data.prediction.length);
            return {
                recommendedId: topPick.card_id,
                allPredictions: data.prediction
            };
        }

        // Fallback: pick first card if prediction fails
        console.warn("[PREDICT] ⚠️ No prediction found, using fallback (first card in pack)");
        return {
            recommendedId: packIds[0],
            allPredictions: []
        };
    };

    // Fetch card image from Scryfall
    const fetchCardImage = async (cardName: string): Promise<string> => {
        const scryfallEndpoint = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${SET_CODE}`;
        console.log(`[SCRYFALL] Fetching image for "${cardName}" from ${SET_CODE.toUpperCase()}`);

        const response = await fetch(scryfallEndpoint);

        if (!response.ok) {
            throw new Error(`Scryfall Error: Status ${response.status} for "${cardName}"`);
        }

        const cardData = await response.json();

        const imageUrl = cardData.image_uris?.normal ||
            cardData.card_faces?.[0]?.image_uris?.normal;

        if (!imageUrl) {
            throw new Error(`No 'normal' image URL found for "${cardName}"`);
        }

        console.log(`[SCRYFALL] Got image URL for "${cardName}"`);
        return imageUrl;
    };

    // Start a new draft
    const startDraft = async () => {
        setLoading(true);
        setStatusMessage("Generating booster packs for all 8 players...");

        try {
            // Generate 8 booster packs (one for each player)
            const packPromises = Array.from({ length: 8 }, () => fetchBoosterPack());
            const allPackIds = await Promise.all(packPromises);

            setStatusMessage("Getting AI recommendations...");
            // Get predictions only for Player 1's pack
            const { recommendedId, allPredictions } = await fetchAIPrediction(allPackIds[0], []);

            setStatusMessage("Fetching card images from Scryfall...");

            // Create initial pack for Player 1 with card info from predictions
            const player1Pack: Card[] = allPackIds[0].map(id => {
                const predictionData = allPredictions.find((p: any) => p.card_id === id);
                return {
                    id,
                    name: predictionData?.card_name || `Card ${id}`,
                    imageUrl: undefined,
                    probability: predictionData?.probability,
                    isRecommended: id === recommendedId
                };
            });

            // Fetch images for Player 1's pack
            const imageResults = await Promise.allSettled(
                allPackIds[0].map(id => {
                    const predictionData = allPredictions.find((p: any) => p.card_id === id);
                    const cardName = predictionData?.card_name || '';
                    return fetchCardImage(cardName);
                })
            );

            // Update pack with images
            const packWithImages = player1Pack.map((card, index) => {
                const result = imageResults[index];
                if (result.status === 'fulfilled') {
                    return { ...card, imageUrl: result.value };
                }
                return card;
            });

            // Store all 8 packs (simplified - we'll track them as arrays of IDs for other players)
            const allPacks = allPackIds.map((packIds, idx) =>
                idx === 0 ? packWithImages : packIds.map(id => ({ id, name: `Card ${id}` }))
            );

            setDraftState({
                currentBooster: 1,
                currentPick: 1,
                currentPack: packWithImages,
                allPacks: allPacks,
                mainPlayer: { id: 1, name: "AI Player 1 (You)", deck: [] },
                otherPlayers: Array.from({ length: 7 }, (_, i) => ({
                    id: i + 2,
                    name: `AI Player ${i + 2}`,
                    deck: [],
                })),
                isActive: true,
                isDrafting: false,
                draftComplete: false,
            });

            setStatusMessage("Draft started! AI Player 1 picks first from their pack. Click 'Next Pick' to begin.");
        } catch (error) {
            setStatusMessage(`Error: ${error instanceof Error ? error.message : "Failed to start draft"}`);
        } finally {
            setLoading(false);
        }
    };

    // Make a pick for the main player
    const makePick = async () => {
        if (draftState.isDrafting || !draftState.isActive || draftState.currentPack.length === 0) return;

        setDraftState(prev => ({ ...prev, isDrafting: true }));
        setStatusMessage(`AI is making pick ${draftState.currentPick} from booster ${draftState.currentBooster}...`);

        try {
            // Get AI recommendation for main player
            const deckIds = draftState.mainPlayer.deck.map(c => c.id);
            const packIds = draftState.currentPack.map(c => c.id);

            const { recommendedId } = await fetchAIPrediction(packIds, deckIds);
            const pickedCard = draftState.currentPack.find(c => c.id === recommendedId) || draftState.currentPack[0];

            console.log(`[PICK] AI picked: ${pickedCard.name} (ID: ${pickedCard.id})`);

            // Update main player's deck
            const updatedMainPlayer = {
                ...draftState.mainPlayer,
                deck: [...draftState.mainPlayer.deck, pickedCard],
            };

            // Remove picked card from Player 1's pack
            const packAfterPlayer1Pick = draftState.currentPack.filter(c => c.id !== pickedCard.id);

            // Simulate all other players picking from their packs simultaneously
            // Each player picks one card from their current pack
            const updatedAllPacks = [...draftState.allPacks];

            // Player 1's pack after their pick (will be passed to next player)
            updatedAllPacks[0] = packAfterPlayer1Pick;

            // Other players pick from their packs
            for (let i = 1; i < 8; i++) {
                const currentPlayerPack = updatedAllPacks[i];
                if (currentPlayerPack.length > 0) {
                    // Simulate other player picking a random card
                    const randomIndex = Math.floor(Math.random() * currentPlayerPack.length);
                    updatedAllPacks[i] = currentPlayerPack.filter((_, idx) => idx !== randomIndex);
                }
            }

            // Now rotate the packs (each player passes their pack to the next player)
            // Booster 1 and 3: pass LEFT (clockwise): Player 1 → Player 2 → ... → Player 8 → Player 1
            // Booster 2: pass RIGHT (counter-clockwise): Player 1 → Player 8 → ... → Player 2 → Player 1
            const passDirection = draftState.currentBooster === 2 ? -1 : 1;
            const rotatedPacks: Card[][] = [];

            for (let i = 0; i < 8; i++) {
                const fromIndex = passDirection === 1
                    ? (i + 1) % 8  // Pass from right (previous player in clockwise)
                    : (i - 1 + 8) % 8;  // Pass from left (previous player in counter-clockwise)
                rotatedPacks[i] = updatedAllPacks[fromIndex];
            }

            // Check if we need a new booster
            const isLastPickInBooster = draftState.currentPick === 14; // After 14 picks, start new booster
            const isLastBooster = draftState.currentBooster === 3;

            if (isLastPickInBooster && isLastBooster) {
                // Draft complete
                console.log("[DRAFT] Draft complete!");
                setDraftState(prev => ({
                    ...prev,
                    mainPlayer: updatedMainPlayer,
                    currentPack: [],
                    allPacks: [],
                    isDrafting: false,
                    isActive: false,
                    draftComplete: true,
                }));
                setStatusMessage("✅ Draft complete! AI Player 1 has drafted all 42 cards.");
                return;
            }

            if (isLastPickInBooster) {
                // Start new booster - generate 8 new packs
                console.log(`[DRAFT] Booster ${draftState.currentBooster} complete, starting booster ${draftState.currentBooster + 1}`);
                setStatusMessage(`Booster ${draftState.currentBooster} complete. Generating new booster packs for all players...`);

                const packPromises = Array.from({ length: 8 }, () => fetchBoosterPack());
                const newAllPackIds = await Promise.all(packPromises);

                setStatusMessage(`Getting AI recommendations for booster ${draftState.currentBooster + 1}...`);
                const { recommendedId: newRecommendedId, allPredictions } = await fetchAIPrediction(newAllPackIds[0], updatedMainPlayer.deck.map(c => c.id));

                setStatusMessage("Fetching card images...");

                const newPlayer1Pack: Card[] = newAllPackIds[0].map(id => {
                    const predictionData = allPredictions.find((p: any) => p.card_id === id);
                    return {
                        id,
                        name: predictionData?.card_name || `Card ${id}`,
                        imageUrl: undefined,
                        probability: predictionData?.probability,
                        isRecommended: id === newRecommendedId
                    };
                });

                // Fetch images for new pack
                const imageResults = await Promise.allSettled(
                    newAllPackIds[0].map(id => {
                        const predictionData = allPredictions.find((p: any) => p.card_id === id);
                        const cardName = predictionData?.card_name || '';
                        return fetchCardImage(cardName);
                    })
                );

                // Update pack with images
                const packWithImages = newPlayer1Pack.map((card, index) => {
                    const result = imageResults[index];
                    if (result.status === 'fulfilled') {
                        return { ...card, imageUrl: result.value };
                    }
                    return card;
                });

                // Store all new packs
                const newAllPacks = newAllPackIds.map((packIds, idx) =>
                    idx === 0 ? packWithImages : packIds.map(id => ({ id, name: `Card ${id}` }))
                );

                const nextBooster = draftState.currentBooster + 1;
                setDraftState(prev => ({
                    ...prev,
                    currentBooster: nextBooster,
                    currentPick: 1,
                    currentPack: packWithImages,
                    allPacks: newAllPacks,
                    mainPlayer: updatedMainPlayer,
                    isDrafting: false,
                }));

                const passDirectionText = nextBooster === 2 ? "counter-clockwise (right)" : "clockwise (left)";
                setStatusMessage(`✅ Booster ${nextBooster} is ready! Fresh 14-card packs for all players. Packs pass ${passDirectionText}. Click "Next Pick" to continue.`);
            } else {
                // Continue with current booster - Player 1 gets the pack that was passed to them
                let nextPackForPlayer1 = rotatedPacks[0];

                console.log(`[DRAFT] Pick ${draftState.currentPick} complete. Player 1 receives pack with ${nextPackForPlayer1.length} cards`);

                // The pack Player 1 receives is just IDs, we need to fetch predictions and images for these cards
                if (nextPackForPlayer1.length > 0 && !nextPackForPlayer1[0].imageUrl) {
                    console.log("[DRAFT] Fetching card data for received pack...");
                    setStatusMessage("Getting AI recommendations for new pack...");

                    const nextPackIds = nextPackForPlayer1.map(c => c.id);
                    const { recommendedId: newRecommendedId, allPredictions } = await fetchAIPrediction(nextPackIds, updatedMainPlayer.deck.map(c => c.id));

                    setStatusMessage("Fetching card images...");

                    // Update cards with names and probabilities
                    const packWithData: Card[] = nextPackIds.map(id => {
                        const predictionData = allPredictions.find((p: any) => p.card_id === id);
                        return {
                            id,
                            name: predictionData?.card_name || `Card ${id}`,
                            imageUrl: undefined,
                            probability: predictionData?.probability,
                            isRecommended: id === newRecommendedId
                        };
                    });

                    // Fetch images
                    const imageResults = await Promise.allSettled(
                        nextPackIds.map(id => {
                            const predictionData = allPredictions.find((p: any) => p.card_id === id);
                            const cardName = predictionData?.card_name || '';
                            return fetchCardImage(cardName);
                        })
                    );

                    // Add images to pack
                    nextPackForPlayer1 = packWithData.map((card, index) => {
                        const result = imageResults[index];
                        if (result.status === 'fulfilled') {
                            return { ...card, imageUrl: result.value };
                        }
                        return card;
                    });

                    // Update the rotated packs with the full card data for player 1's pack
                    rotatedPacks[0] = nextPackForPlayer1;
                }

                setDraftState(prev => ({
                    ...prev,
                    currentPick: prev.currentPick + 1,
                    currentPack: nextPackForPlayer1,
                    allPacks: rotatedPacks,
                    mainPlayer: updatedMainPlayer,
                    isDrafting: false,
                }));
                setStatusMessage(`✅ AI picked ${pickedCard.name}. Pack passed to next player. You received a pack with ${nextPackForPlayer1.length} cards. Click "Next Pick" for pick ${draftState.currentPick + 1}/14.`);
            }
        } catch (error) {
            console.error("[ERROR]", error);
            setStatusMessage(`Error: ${error instanceof Error ? error.message : "Failed to make pick"}`);
            setDraftState(prev => ({ ...prev, isDrafting: false }));
        }
    };

    // Reset draft
    const resetDraft = () => {
        setDraftState({
            currentBooster: 1,
            currentPick: 1,
            currentPack: [],
            allPacks: [],
            mainPlayer: { id: 1, name: "AI Player 1 (You)", deck: [] },
            otherPlayers: Array.from({ length: 7 }, (_, i) => ({
                id: i + 2,
                name: `AI Player ${i + 2}`,
                deck: [],
            })),
            isActive: false,
            isDrafting: false,
            draftComplete: false,
        });
        setStatusMessage("");
    };

    const getProbabilityColor = (probability?: number): string => {
        if (!probability) return 'text-gray-400';
        const percent = probability * 100;
        if (percent < 20) return 'text-red-500';
        if (percent < 60) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">AI Draft Simulator</h1>
                        <p className="text-gray-400">Watch AI Player 1 draft through 3 boosters with 7 other AI players</p>
                    </div>
                    <div className="flex gap-3">
                        {!draftState.isActive && !draftState.draftComplete && (
                            <Button
                                before={<Play />}
                                onClick={startDraft}
                                disabled={loading}
                                size="sm"
                            >
                                {loading ? "Starting..." : "Start Draft"}
                            </Button>
                        )}
                        {(draftState.isActive || draftState.draftComplete) && (
                            <Button
                                before={<RotateCcw />}
                                onClick={resetDraft}
                                variant="secondary"
                                size="sm"
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status Message */}
                {statusMessage && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg text-blue-400">
                        {statusMessage}
                    </div>
                )}

                {/* Draft Progress */}
                {draftState.isActive && (
                    <div className="grid grid-cols-3 gap-4 p-6 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Current Booster</div>
                            <div className="text-3xl font-bold text-white">{draftState.currentBooster} / 3</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Current Pick</div>
                            <div className="text-3xl font-bold text-white">{draftState.currentPick} / 14</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Cards Drafted</div>
                            <div className="text-3xl font-bold text-white">
                                {draftState.mainPlayer.deck.length} / 42
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Pack */}
                {draftState.isActive && draftState.currentPack.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold text-white">
                                Current Pack ({draftState.currentPack.length} cards remaining)
                            </h2>
                            <Button
                                before={<ChevronRight />}
                                onClick={makePick}
                                disabled={draftState.isDrafting}
                                size="sm"
                            >
                                {draftState.isDrafting ? "Picking..." : "Next Pick"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {draftState.currentPack.map((card) => (
                                <div key={card.id} className="relative group">
                                    <div className={`aspect-[5/7] rounded-lg overflow-hidden bg-white/5 ${
                                        card.isRecommended
                                            ? 'border-4 border-purple-500 shadow-lg shadow-purple-500/50'
                                            : 'border border-white/10'
                                    }`}>
                                        {card.imageUrl ? (
                                            <img
                                                src={card.imageUrl}
                                                alt={card.name}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://placehold.co/250x350/333333/FFFFFF?text=${encodeURIComponent(card.name)}`;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-2">
                                                <div className="text-center text-sm text-white font-medium break-words">
                                                    {card.name}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Probability indicator */}
                                    {card.probability !== undefined && (
                                        <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded px-2 py-1">
                                            <div className={`text-xs font-bold text-center ${getProbabilityColor(card.probability)}`}>
                                                {(card.probability * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    )}

                                    {/* Card name and recommendation tooltip on hover */}
                                    <div className="absolute top-2 left-2 right-2 bg-black/80 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {card.name}
                                        {card.isRecommended && <span className="ml-2 text-purple-400">⭐ AI Pick</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Drafted Cards */}
                {draftState.mainPlayer.deck.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-white">
                            {draftState.mainPlayer.name}s Deck ({draftState.mainPlayer.deck.length} cards)
                        </h2>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
                            {draftState.mainPlayer.deck.map((card, idx) => (
                                <div
                                    key={`${card.id}-${idx}`}
                                    className="aspect-[5/7] rounded overflow-hidden bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 group relative"
                                >
                                    {card.imageUrl ? (
                                        <img
                                            src={card.imageUrl}
                                            alt={card.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-1">
                                            <div className="text-center text-xs text-white break-words">
                                                {card.name}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tooltip */}
                                    <div className="absolute inset-0 bg-black/80 text-white text-xs p-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-center break-words">{card.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Draft Complete Message */}
                {draftState.draftComplete && (
                    <div className="p-8 bg-green-500/10 border border-green-500/50 rounded-lg text-center">
                        <h2 className="text-3xl font-bold text-green-400 mb-2">Draft Complete!</h2>
                        <p className="text-gray-300">
                            {draftState.mainPlayer.name} has drafted all 42 cards across 3 boosters.
                        </p>
                    </div>
                )}

                {/* Instructions */}
                {!draftState.isActive && !draftState.draftComplete && (
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-3">How It Works</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>• 8 AI players draft together (youre watching AI Player 1)</li>
                            <li>• Each player drafts 3 boosters with 14 picks each = 42 total cards</li>
                            <li>• AI uses machine learning to make optimal picks based on the current deck</li>
                            <li>• After each pick, players pass their packs to the next player</li>
                            <li>• Track progress through Booster 1 → 2 → 3</li>
                            <li>• Purple border highlights the AIs recommended pick</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}