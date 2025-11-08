import { STORAGE_KEYS } from './constants';
import { DraftState, Card } from '../types';

/**
 * Save draft state to localStorage
 */
export const saveDraftToLocalStorage = (
  draftState: DraftState | null,
  pickedCards: Card[],
  currentSet: string
) => {
  try {
    if (draftState) {
      localStorage.setItem(STORAGE_KEYS.DRAFT_STATE, JSON.stringify(draftState));
      localStorage.setItem(STORAGE_KEYS.PICKED_CARDS, JSON.stringify(pickedCards));
      localStorage.setItem(STORAGE_KEYS.CURRENT_SET, currentSet);
    }
  } catch (error) {
    console.error('Failed to save draft to localStorage:', error);
  }
};

/**
 * Load draft state from localStorage
 */
export const loadDraftFromLocalStorage = (): {
  draftState: DraftState | null;
  pickedCards: Card[];
  currentSet: string;
} | null => {
  try {
    const draftStateStr = localStorage.getItem(STORAGE_KEYS.DRAFT_STATE);
    const pickedCardsStr = localStorage.getItem(STORAGE_KEYS.PICKED_CARDS);
    const currentSet = localStorage.getItem(STORAGE_KEYS.CURRENT_SET);

    if (draftStateStr && pickedCardsStr && currentSet) {
      return {
        draftState: JSON.parse(draftStateStr),
        pickedCards: JSON.parse(pickedCardsStr),
        currentSet,
      };
    }
  } catch (error) {
    console.error('Failed to load draft from localStorage:', error);
  }
  return null;
};

/**
 * Clear draft state from localStorage
 */
export const clearDraftFromLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_STATE);
    localStorage.removeItem(STORAGE_KEYS.PICKED_CARDS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SET);
  } catch (error) {
    console.error('Failed to clear draft from localStorage:', error);
  }
};
