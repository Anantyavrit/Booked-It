import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { getYouTubeEmbedUrl } from '../utils/format.js';

export default function TrailerModal({ isOpen, trailerUrl, movieTitle, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const embedUrl = getYouTubeEmbedUrl(trailerUrl);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#18181c] border border-[#2a2a30] rounded-lg overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-3.5 border-b border-[#2a2a30]">
          <h3 className="font-['Outfit'] text-sm font-semibold text-[#f4f4f6] truncate">
            {movieTitle} — Official Trailer
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#92929e] hover:text-[#f4f4f6] hover:bg-[#222227] transition-colors cursor-pointer"
            aria-label="Close trailer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {embedUrl ? (
            <iframe
              src={`${embedUrl}?autoplay=1`}
              title={`${movieTitle} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#92929e]">
              Trailer video preview is currently unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
