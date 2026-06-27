
import React from 'react';

interface ShareButtonProps {
  onShareTrigger: (e: React.MouseEvent) => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ onShareTrigger }) => {
  return (
    <button
      type="button"
      onClick={onShareTrigger}
      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white border border-white/10 hover:scale-105 active:scale-95 transition-all z-10"
      title="Share this deal"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
    </button>
  );
};
