import { useState } from 'react';

const Flashcard = ({ vocabulary, onUpdateStatus, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!vocabulary || vocabulary.length === 0) {
    return <div className="text-center p-lg">No vocabulary available for flashcards.</div>;
  }

  const currentItem = vocabulary[currentIndex];

  // Support for both old and new data formats
  const targetTerm = currentItem.termTargetLanguage || currentItem.target;
  const nativeTerm = currentItem.termNativeLanguage || currentItem.native;
  const exampleTarget = currentItem.exampleSentenceTargetLanguage;
  const exampleNative = currentItem.exampleSentenceNativeLanguage;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % vocabulary.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <div className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
        Card {currentIndex + 1} of {vocabulary.length}
      </div>

      <div
        className="relative w-full aspect-[4/3] perspective-1000 cursor-pointer group"
        onClick={handleFlip}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-surface-container-lowest border-2 border-primary/20 rounded-2xl shadow-lg flex flex-col items-center justify-center p-xl text-center">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center opacity-60">
               <span className="text-[10px] font-bold uppercase tracking-tighter bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                 {currentItem.targetLanguage}
               </span>
               <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                 {currentItem.level}
               </span>
            </div>

            <h2 className="text-headline-md font-bold text-primary">{targetTerm}</h2>

            <div className="absolute bottom-12 w-full text-center">
               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate px-8">
                 {currentItem.sourceStoryTitle}
               </p>
            </div>
            <p className="absolute bottom-4 w-full text-center text-xs text-on-surface-variant font-bold uppercase tracking-widest">Tap to flip</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface-container-lowest border-2 border-secondary/20 rounded-2xl shadow-lg flex flex-col p-lg overflow-y-auto">
            <div className="flex-grow flex flex-col justify-center text-center space-y-4">
              <div>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Meaning</p>
                <h3 className="text-xl font-bold text-on-surface">{nativeTerm}</h3>
              </div>

              {exampleTarget && (
                <div className="border-t border-outline-variant pt-4">
                  <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">In Context</p>
                  <p className="text-body-lg font-semibold text-on-surface italic">{exampleTarget}</p>
                  {exampleNative && (
                    <p className="text-body-md text-on-surface-variant mt-2">{exampleNative}</p>
                  )}
                </div>
              )}

              {!exampleTarget && (
                <div className="border-t border-outline-variant pt-4">
                   <p className="text-xs font-bold text-on-surface-variant italic">No example sentence yet.</p>
                </div>
              )}
            </div>

            {/* Review Status Buttons (only if onUpdateStatus is provided) */}
            {onUpdateStatus && (
              <div className="mt-6 flex gap-3 px-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(currentItem.id, 'stillLearning');
                    handleNext();
                  }}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl font-bold text-xs border border-amber-200 transition-all"
                >
                  Still learning
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(currentItem.id, 'known');
                    handleNext();
                  }}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-xs border border-emerald-200 transition-all"
                >
                  Know it
                </button>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-on-surface-variant font-bold uppercase tracking-widest">Tap to flip back</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 w-full">
        <button
          onClick={handlePrev}
          className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Prev</span>
        </button>
        <button
          onClick={handleFlip}
          className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all"
        >
          {isFlipped ? 'Show Front' : 'Flip Card'}
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
        >
          <span>Next</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default Flashcard;
