// === CONFIGURATION CONSTANTS ===

// Default card display width in pixels
export const DEFAULT_CARD_WIDTH = 170;
export const MIN_CARD_WIDTH = 120;
export const MAX_CARD_WIDTH = 350;

// MTG card aspect ratio (don't change this)
export const CARD_ASPECT_RATIO = 2.5 / 3.5;

// Scryfall image quality
// Available versions and their sizes:
// - 'small': 146 x 204 (not recommended, too low quality)
// - 'normal': 488 x 680 (good for smaller displays)
// - 'large': 672 x 936 (good balance)
// - 'png': 745 x 1040 (highest quality, recommended)
// For card sizes up to 300px, 'png' is recommended
// For larger sizes (300px+), 'png' is essential for clarity
export const SCRYFALL_IMAGE_VERSION = 'png';

export const API_ENDPOINT = 'https://mtgdraftassistant.onrender.com/booster?set=MH3';

// LocalStorage keys
export const STORAGE_KEYS = {
  DRAFT_STATE: 'mtg_draft_state',
  PICKED_CARDS: 'mtg_picked_cards',
  CURRENT_SET: 'mtg_current_set',
};

// CSS Keyframe for modern animation
export const HOVER_PREVIEW_STYLE = `
@keyframes pop-in {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}
.pop-in {
    animation: pop-in 0.3s ease-out forwards;
}

@keyframes radiate {
    0%, 100% {
        box-shadow: 0 -8px 16px rgba(250, 204, 21, 0.6), 0 -4px 8px rgba(250, 204, 21, 0.4), 0 -2px 4px rgba(250, 204, 21, 0.3);
    }
    50% {
        box-shadow: 0 -16px 28px rgba(250, 204, 21, 0.8), 0 -8px 16px rgba(250, 204, 21, 0.6), 0 -4px 8px rgba(250, 204, 21, 0.4);
    }
}
.radiate {
    animation: radiate 2s ease-in-out infinite;
}

/* Custom slider styles */
input[type="range"].slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #9333ea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"].slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #9333ea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input[type="range"].slider::-webkit-slider-thumb:hover {
    background: #a855f7;
    transform: scale(1.1);
}

input[type="range"].slider::-moz-range-thumb:hover {
    background: #a855f7;
    transform: scale(1.1);
}
`;
