import React, { useEffect } from 'react';
import { Card } from '../types';

interface CardViewerProps {
  card: Card;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export const CardViewer: React.FC<CardViewerProps> = ({
  card,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && canGoPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext, canGoPrevious, canGoNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative flex items-center gap-4 max-w-7xl w-full">
        {/* Previous Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          disabled={!canGoPrevious}
          className={`p-3 rounded-full transition-all ${
            canGoPrevious
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Previous card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Card Image */}
        <div
          className="flex-1 flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            className="max-h-[85vh] w-auto rounded-2xl shadow-2xl"
          />
        </div>

        {/* Next Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={!canGoNext}
          className={`p-3 rounded-full transition-all ${
            canGoNext
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Next card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm">
        Use arrow keys to navigate (wraps around) • ESC to close
      </div>
    </div>
  );
};
