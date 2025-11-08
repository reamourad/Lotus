// --- Type Definitions ---
export interface Card {
  name: string;
  imageUrl: string;
  id: string; // Unique identifier for picking/keys
  cmc: number; // Converted mana cost
  columnId?: number; // Which column the card is assigned to (for manual organization)
}

export interface BoosterData {
  // Corrected structure based on the console error report
  pack: string[];
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
