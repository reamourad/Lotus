'use client';

import { DraftExperience } from '../play/DraftExperience';

export default function HobbitPage() {
  return (
    <DraftExperience
      lockedSetCode="HOB"
      activeTab="hobbit"
      showModelBoxes
      intro={
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">The Hobbit — model comparison</h1>
          <p className="mt-1 text-sm text-gray-400">
            A full draft of The Hobbit against seven drafters. Every model ranks each pack you are
            passed; click one to put its numbers on the cards. The model you choose also makes the
            other seven drafters&apos; picks.
          </p>
        </div>
      }
    />
  );
}
