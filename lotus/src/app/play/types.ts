// --- Type Definitions ---
export interface Card {
  name: string;
  imageUrl: string;
  id: string; // Unique identifier for picking/keys
  cmc: number; // Converted mana cost
  columnId?: number; // Which column the card is assigned to (for manual organization)
  set_code?: string; // Set code for Arena format export
  collector_number?: string; // Collector number for Arena format export
  mana_cost?: string; // e.g. "{1}{G}"
  types?: string[];
  subtypes?: string[];
  rarity?: string;
  power?: number | null;
  toughness?: number | null;
  oracle_text?: string;
}

export interface BoosterCard {
  name: string;
  mana_cost: string;
  cmc: number;
  types: string[];
  subtypes: string[];
  rarity: string;
  power: number | null;
  toughness: number | null;
  oracle_text: string;
}

export interface BoosterData {
  pack: BoosterCard[];
  set: string;
  count: number;
}

export interface Player {
  id: number;
  isHuman: boolean;
  picks: Card[];
  currentPack: Card[];
}

export interface DraftState {
  currentBooster: number; // 1, 2, or 3
  currentPick: number; // Pick number within the booster
  players: Player[];
  direction: 'clockwise' | 'counterclockwise'; // Direction changes each booster
}

export interface HoverPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settings {
  isAiPredictionEnabled: boolean;
  isHoverPreviewEnabled: boolean;
  selectedModelId?: string | null;
}

export interface ModelInfo {
  model_id: string;
  version: string;
  description: string;
  train_sets: string[];
  held_out_sets: string[];
  loaded: boolean;
  is_default: boolean;
  metrics: {
    fold: { top_1_accuracy?: number; mrr?: number } | null;
    holdout: { top_1_accuracy?: number; mrr?: number } | null;
  };
}
