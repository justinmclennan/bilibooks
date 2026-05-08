import { useState } from 'react';

const Flashcard = ({ vocabulary, onUpdateStatus }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showVerbGrid, setShowVerbGrid] = useState(false);

  if (!vocabulary || vocabulary.length === 0) {
    return <div className="text-center p-lg text-on-surface">No vocabulary available for flashcards.</div>;
  }

  const currentItem = vocabulary[currentIndex];

  // Support for both old and new data formats
  const targetTerm = currentItem.termTargetLanguage || currentItem.target;
  const nativeTerm = currentItem.termNativeLanguage || currentItem.native;
  const exampleTarget = currentItem.exampleSentenceTargetLanguage;
  const exampleNative = currentItem.exampleSentenceNativeLanguage;

  const handleNext = () => {
    setIsFlipped(false);
    setShowVerbGrid(false);
    setCurrentIndex((prev) => (prev + 1) % vocabulary.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowVerbGrid(false);
    setCurrentIndex((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
  };

  const handleFlip = () => {
    if (showVerbGrid) {
      setShowVerbGrid(false);
    } else {
      setIsFlipped(!isFlipped);
    }
  };

  const isVerb = currentItem.partOfSpeech === 'verb' || (currentItem.verbForms && Object.keys(currentItem.verbForms).length > 0);

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <div className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
        Card {currentIndex + 1} of {vocabulary.length}
      </div>

      <div
        className="relative w-full aspect-[4/3] perspective-1000 cursor-pointer group"
        onClick={handleFlip}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped && !showVerbGrid ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className={`absolute inset-0 backface-hidden bg-surface-container-lowest border-2 border-primary/20 rounded-2xl shadow-lg flex flex-col items-center justify-center p-xl text-center transition-opacity duration-300 ${showVerbGrid ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-headline-md font-bold text-primary">{targetTerm}</h2>
            <p className="mt-4 text-sm text-on-surface-variant font-bold uppercase tracking-widest">Tap to flip</p>
          </div>

          {/* Verb Grid (Alternative Back View) */}
          {showVerbGrid && (
            <div className="absolute inset-0 bg-surface-container-lowest border-2 border-blue-400/40 rounded-2xl shadow-lg flex flex-col p-lg overflow-y-auto z-20">
               <div className="flex-grow">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4 text-center">Quick Verb Grid</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className="p-2 border border-outline-variant text-left text-on-surface">Person</th>
                          <th className="p-2 border border-outline-variant text-left text-on-surface">Present</th>
                          <th className="p-2 border border-outline-variant text-left text-on-surface">Passé Composé</th>
                          <th className="p-2 border border-outline-variant text-left text-on-surface">Imparfait</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border border-outline-variant font-bold bg-surface-container-low text-on-surface">je</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.present?.je || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.passeCompose?.je || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.imparfait?.je || '-'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-outline-variant font-bold bg-surface-container-low text-on-surface">tu</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.present?.tu || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.passeCompose?.tu || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.imparfait?.tu || '-'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-outline-variant font-bold bg-surface-container-low text-[10px] text-on-surface">il / elle / on</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.present?.thirdPerson || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.passeCompose?.thirdPerson || '-'}</td>
                          <td className="p-2 border border-outline-variant italic text-on-surface">{currentItem.verbForms?.imparfait?.thirdPerson || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
               </div>
               <div className="mt-4 flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowVerbGrid(false); }}
                    className="bg-surface-container-high text-on-surface px-4 py-2 rounded-lg font-bold text-xs border border-outline-variant hover:bg-surface-container-highest transition-all"
                  >
                    Back to Example
                  </button>
               </div>
            </div>
          )}

          {/* Back */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-surface-container-lowest border-2 border-secondary/20 rounded-2xl shadow-lg flex flex-col p-lg overflow-y-auto ${showVerbGrid ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                   <p className="text-xs font-bold text-on-surface-variant italic">No story example found.</p>
                </div>
              )}
            </div>

            {isVerb && (
              <div className="mt-4 mb-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVerbGrid(true); }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-4 rounded-xl font-bold text-xs border border-blue-200 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <span className="material-symbols-outlined text-sm">grid_view</span>
                  Verb Forms
                </button>
              </div>
            )}

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
          {showVerbGrid ? 'Show Example' : (isFlipped ? 'Show Front' : 'Flip Card')}
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
