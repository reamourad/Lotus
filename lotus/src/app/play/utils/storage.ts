import { STORAGE_KEYS } from './constants';
import { DraftState, Card, Settings } from '../types';

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

/**
 * Save settings to localStorage
 */
export const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
};

/**
 * Load settings from localStorage
 */
export const loadSettings = (): Settings | null => {
  try {
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settingsStr) {
      return JSON.parse(settingsStr);
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return null;
};
