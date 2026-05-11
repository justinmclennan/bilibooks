import { useState, useEffect, useMemo } from 'react';

const CEFR_LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2'];
const BATCH_SIZE = 20;

const MyVocabulary = ({ onUseSelectedWords }) => {
  const [allVocab, setAllVocab] = useState([]);
  const [candidateVocab, setCandidateVocab] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('B1');
  const [displayMode, setDisplayMode] = useState('both'); // 'english', 'french', 'both'
  const [selectedWords, setSelectedWords] = useState(() => {
    const saved = localStorage.getItem('linguStory_vocab_selection');
    return saved ? JSON.parse(saved) : [];
  });
  const [knownWordIds, setKnownWordIds] = useState(new Set());
  const [usedWordIds, setUsedWordIds] = useState(new Set());

  // Parse CSV helper
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      return obj;
    });
  };

  useEffect(() => {
    const loadVocab = async () => {
      try {
        const response = await fetch('/vocabulary_all_levels.csv');
        if (!response.ok) throw new Error('Failed to fetch vocabulary file');
        const text = await response.text();
        const rawData = parseCSV(text);

        // Load progress from localStorage
        const storedProgress = JSON.parse(localStorage.getItem('linguStory_vocab_progress') || '{}');
        const known = new Set();
        const used = new Set();

        const structuredData = rawData.map(item => {
          const id = `${item.level}-${item.category}-${item.nativeWord}-${item.targetWord}`.replace(/\s+/g, '-').toLowerCase();
          if (storedProgress[id]?.isKnown) known.add(id);
          if (storedProgress[id]?.hasBeenUsedInStory) used.add(id);

          return {
            id,
            level: item.level,
            category: item.category,
            nativeWord: item.nativeWord,
            targetWord: item.targetWord,
            partOfSpeech: item.partOfSpeech || '',
          };
        });

        setAllVocab(structuredData);
        setKnownWordIds(known);
        setUsedWordIds(used);

        // Initial batch for default level
        generateBatch(structuredData, 'B1');
      } catch (err) {
        console.error('Error loading vocabulary:', err);
        setError('Failed to load vocabulary. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVocab();
  }, []);

  const generateBatch = (vocab, level) => {
    const levelWords = vocab.filter(item => item.level === level);
    // Shuffle and pick BATCH_SIZE
    const shuffled = [...levelWords].sort(() => 0.5 - Math.random());
    setCandidateVocab(shuffled.slice(0, BATCH_SIZE));
  };

  const handleRefresh = () => {
    generateBatch(allVocab, selectedLevel);
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    generateBatch(allVocab, level);
  };

  const toggleKnown = (id) => {
    const newKnown = new Set(knownWordIds);
    if (newKnown.has(id)) {
      newKnown.delete(id);
    } else {
      newKnown.add(id);
    }
    setKnownWordIds(newKnown);
    saveProgress(newKnown, usedWordIds);
  };

  const saveProgress = (known, used) => {
    const progress = {};
    // This is a bit inefficient but matches the existing pattern
    allVocab.forEach(item => {
      if (known.has(item.id) || used.has(item.id)) {
        progress[item.id] = {
          isKnown: known.has(item.id),
          hasBeenUsedInStory: used.has(item.id)
        };
      }
    });
    localStorage.setItem('linguStory_vocab_progress', JSON.stringify(progress));
  };

  const toggleSelection = (word) => {
    let newSelection;
    if (selectedWords.find(w => w.id === word.id)) {
      newSelection = selectedWords.filter(w => w.id !== word.id);
    } else {
      newSelection = [...selectedWords, word];
    }
    setSelectedWords(newSelection);
    localStorage.setItem('linguStory_vocab_selection', JSON.stringify(newSelection));
  };

  const stats = useMemo(() => {
    const total = allVocab.length;
    const known = knownWordIds.size;

    const levelStats = CEFR_LEVELS.reduce((acc, lvl) => {
      const items = allVocab.filter(i => i.level === lvl);
      acc[lvl] = {
        total: items.length,
        known: items.filter(i => knownWordIds.has(i.id)).length
      };
      return acc;
    }, {});

    return { total, known, levelStats };
  }, [allVocab, knownWordIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        <p className="mt-4 text-on-surface-variant font-body-md">Loading vocabulary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container p-lg rounded-xl flex items-center gap-md border border-error/20">
        <span className="material-symbols-outlined text-error">error</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Vocabulary Workspace</h1>
          <p className="text-on-surface-variant">Select words for your next story and track your progress.</p>
        </div>
        <div className="bg-primary-fixed/30 px-6 py-4 rounded-2xl border border-primary/20">
          <div className="text-label-caps font-bold text-primary mb-1">{selectedLevel} PROGRESS</div>
          <div className="flex items-center gap-4">
            <div className="flex-grow h-2 bg-surface-container-highest rounded-full min-w-[120px] overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(stats.levelStats[selectedLevel].known / stats.levelStats[selectedLevel].total) * 100}%` }}
              ></div>
            </div>
            <span className="font-headline-sm text-on-surface">
              {stats.levelStats[selectedLevel].known} / {stats.levelStats[selectedLevel].total}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Selection Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 ml-1">Target Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    className="bg-surface-container-lowest border-outline-variant rounded-xl px-4 py-2 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                  >
                    {CEFR_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                   <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 ml-1">&nbsp;</label>
                   <button
                     onClick={handleRefresh}
                     className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                   >
                     <span className="material-symbols-outlined text-sm">refresh</span>
                     Refresh Batch
                   </button>
                </div>
              </div>

              <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant self-end">
                {['english', 'french', 'both'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setDisplayMode(mode)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${displayMode === mode ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidateVocab.map(word => {
                const isSelected = selectedWords.some(w => w.id === word.id);
                const isKnown = knownWordIds.has(word.id);
                const isUsed = usedWordIds.has(word.id);

                return (
                  <div
                    key={word.id}
                    className={`group relative flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected ? 'bg-primary-container border-primary shadow-sm' :
                      isKnown ? 'bg-emerald-50/50 border-emerald-100 opacity-60' :
                      'bg-surface-container-lowest border-outline-variant hover:border-primary/50 hover:shadow-sm'
                    }`}
                    onClick={() => toggleSelection(word)}
                  >
                    <div className="flex items-center">
                       <input
                         type="checkbox"
                         checked={isSelected}
                         onChange={() => {}} // Handled by parent div
                         className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer pointer-events-none"
                       />
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-bold truncate transition-all ${displayMode === 'english' ? 'blur-[3px] select-none opacity-20' : 'text-on-surface'}`}>
                          {word.targetWord}
                        </span>
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase opacity-60">{word.partOfSpeech}</span>
                      </div>
                      <div className={`text-sm truncate transition-all ${displayMode === 'french' ? 'blur-[3px] select-none opacity-20' : 'text-on-surface-variant'}`}>
                        {word.nativeWord}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isUsed && !isSelected && (
                        <span className="material-symbols-outlined text-sm text-secondary" title="Used in story">auto_awesome</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleKnown(word.id);
                        }}
                        className={`material-symbols-outlined text-xl transition-colors ${isKnown ? 'text-emerald-500' : 'text-outline hover:text-emerald-400 opacity-0 group-hover:opacity-100'}`}
                      >
                        {isKnown ? 'check_circle' : 'circle'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected List */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-surface-container-highest p-6 rounded-3xl border border-primary/20 sticky top-4 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-sm text-on-surface">Selected Vocabulary</h2>
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold">
                  {selectedWords.length} words
                </span>
              </div>

              {selectedWords.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-outline-variant rounded-2xl">
                  <span className="material-symbols-outlined text-4xl text-outline mb-4">format_list_bulleted</span>
                  <p className="text-on-surface-variant font-medium">No words selected yet.</p>
                  <p className="text-[10px] text-on-surface-variant mt-2 uppercase font-bold">Click words on the left to add them</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedWords.map(word => (
                    <div key={word.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant group">
                       <div className="flex flex-col min-w-0">
                         <span className="font-bold text-sm text-primary truncate">{word.targetWord}</span>
                         <span className="text-[10px] text-on-surface-variant truncate">{word.nativeWord}</span>
                       </div>
                       <button
                         onClick={() => toggleSelection(word)}
                         className="text-outline hover:text-error transition-colors"
                       >
                         <span className="material-symbols-outlined text-sm">close</span>
                       </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-outline-variant">
                <button
                  disabled={selectedWords.length === 0}
                  onClick={() => {
                     // Mark words as used in story state
                     const newUsed = new Set(usedWordIds);
                     selectedWords.forEach(w => newUsed.add(w.id));
                     setUsedWordIds(newUsed);
                     saveProgress(knownWordIds, newUsed);

                     // Clear selection after generation
                     setSelectedWords([]);
                     localStorage.removeItem('linguStory_vocab_selection');

                     onUseSelectedWords(selectedWords, selectedLevel);
                  }}
                  className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
                >
                  Generate Story
                  <span className="material-symbols-outlined">auto_awesome</span>
                </button>
                <p className="text-[10px] text-on-surface-variant text-center mt-4 font-bold uppercase tracking-widest">
                  Uses {selectedWords.length} selected words
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MyVocabulary;
