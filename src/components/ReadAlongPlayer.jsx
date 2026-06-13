import { useState, useRef, useEffect } from 'react';

const ReadAlongPlayer = ({ audioUrl, chapters, mode = 'interlinear', targetFirst = true, timepoints = [] }) => {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeMark, setActiveMark] = useState(null);

  useEffect(() => {
    if (!timepoints || timepoints.length === 0) return;

    // Find the mark that corresponds to the current time
    // Timepoints are typically sorted by time
    let currentMark = null;
    for (let i = 0; i < timepoints.length; i++) {
      if (timepoints[i].timeSeconds <= currentTime) {
        currentMark = timepoints[i].markName;
      } else {
        break;
      }
    }
    setActiveMark(currentMark);
  }, [currentTime, timepoints]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const isMarkActive = (cIdx, lIdx, pIdx) => {
    if (!activeMark) return false;
    return activeMark === `mark_${cIdx}_${lIdx}_${pIdx}`;
  };

  // Check if any part of the line is active
  const isLineActive = (cIdx, lIdx) => {
    if (!activeMark) return false;
    return activeMark.startsWith(`mark_${cIdx}_${lIdx}_`);
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="sticky top-0 bg-surface-container-lowest pb-4 pt-2 z-10 border-b border-outline-variant">
        <h3 className="text-headline-sm font-bold text-primary mb-4">Read Along</h3>
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-full"
          onTimeUpdate={handleTimeUpdate}
        />
      </div>

      <div className="space-y-12 pb-12">
        {chapters.map((chapter, cIdx) => (
          <div key={cIdx} className="space-y-8">
            {chapter.chapterTitle && (
              <h4 className="text-xl font-bold text-primary border-b border-outline-variant pb-2">
                {chapter.chapterTitle}
              </h4>
            )}
            <div className="space-y-8">
              {chapter.lines?.map((line, lIdx) => (
                <div
                  key={lIdx}
                  className={`space-y-4 p-2 rounded-lg transition-colors duration-300 ${isLineActive(cIdx, lIdx) ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                >
                  <div className="space-y-1">
                    <p className={`text-body-lg font-bold transition-colors ${isLineActive(cIdx, lIdx) ? 'text-primary' : 'text-on-surface'}`}>
                      {line.target}
                    </p>
                    <p className="text-body-md text-on-surface-variant italic">
                      {line.native}
                    </p>
                  </div>

                  {/* Split halves if available (for A2/B1) */}
                  {line.targetFirstHalf && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`space-y-1 p-2 rounded transition-colors ${isMarkActive(cIdx, lIdx, 0) || isMarkActive(cIdx, lIdx, 1) ? 'bg-primary/10' : ''}`}>
                           <p className="text-sm font-bold text-primary/80 uppercase tracking-widest">Part 1</p>
                           <p className="text-body-md font-semibold text-on-surface">{line.targetFirstHalf}</p>
                           <p className="text-xs text-on-surface-variant italic">{line.nativeFirstHalf}</p>
                        </div>
                        <div className={`space-y-1 p-2 rounded transition-colors ${isMarkActive(cIdx, lIdx, 2) || isMarkActive(cIdx, lIdx, 3) ? 'bg-primary/10' : ''}`}>
                           <p className="text-sm font-bold text-primary/80 uppercase tracking-widest">Part 2</p>
                           <p className="text-body-md font-semibold text-on-surface">{line.targetSecondHalf}</p>
                           <p className="text-xs text-on-surface-variant italic">{line.nativeSecondHalf}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadAlongPlayer;
