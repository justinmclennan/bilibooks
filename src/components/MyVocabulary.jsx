import { useState, useEffect, useMemo } from 'react';

const CEFR_LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2'];
const CATEGORIES = [
  'General',
  'High-frequency words',
  'Verbs',
  'Nouns',
  'Adjectives',
  'Adverbs',
  'Connectors',
  'Expressions',
  'Questions',
  'People & family',
  'Places & travel',
  'Food & restaurants',
  'Home & daily life',
  'School & work',
  'Emotions & opinions',
  'Time & routines'
];
const BATCH_SIZE = 12;

const MyVocabulary = ({ onUseSelectedWords, targetLanguage, nativeLanguage, currentLevel }) => {
  const [allVocab, setAllVocab] = useState([]);
  const [candidateVocab, setCandidateVocab] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(currentLevel || 'B1');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [displayMode, setDisplayMode] = useState('both'); // 'native', 'target', 'both'
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
      setIsLoading(true);
      try {
        // Load progress from localStorage
        const storedProgress = JSON.parse(localStorage.getItem('linguStory_vocab_progress') || '{}');
        const known = new Set();
        const used = new Set();

        // Only load static CSV if it matches French-English for now (seeds)
        // In a real app, we'd have multiple CSVs or a database.
        let structuredData = [];
        if (targetLanguage === 'French' && nativeLanguage === 'English') {
          const response = await fetch('/vocabulary_all_levels.csv');
          if (response.ok) {
            const text = await response.text();
            const rawData = parseCSV(text);
            structuredData = rawData.map(item => {
              const id = `${item.level}-${item.category}-${item.nativeWord}-${item.targetWord}`.replace(/\s+/g, '-').toLowerCase();
              return {
                id,
                level: item.level,
                category: item.category,
                nativeWord: item.nativeWord,
                targetWord: item.targetWord,
                partOfSpeech: item.partOfSpeech || '',
                targetLanguage: 'French',
                nativeLanguage: 'English',
                source: 'static'
              };
            });
          }
        }

        // Merge progress for static words
        structuredData.forEach(item => {
          if (storedProgress[item.id]?.isKnown) known.add(item.id);
          if (storedProgress[item.id]?.hasBeenUsedInStory) used.add(item.id);
        });

        setAllVocab(structuredData);
        setKnownWordIds(known);
        setUsedWordIds(used);

        // Initial batch
        fetchBatch(structuredData, selectedLevel, selectedCategory);
      } catch (err) {
        console.error('Error loading vocabulary:', err);
        setError('Failed to load vocabulary workspace.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVocab();
  }, [targetLanguage, nativeLanguage]);

  const fetchBatch = async (vocab, level, category) => {
    setIsRefreshing(true);
    try {
      // 1. Try to find matching words in our local seed list
      const matchingLocal = vocab.filter(item =>
        item.level === level &&
        (category === 'General' || item.category.toLowerCase() === category.toLowerCase())
      );

      // 2. If we have enough local words, use them (shuffled)
      if (matchingLocal.length >= BATCH_SIZE) {
        const shuffled = [...matchingLocal].sort(() => 0.5 - Math.random());
        setCandidateVocab(shuffled.slice(0, BATCH_SIZE));
      } else {
        // 3. Otherwise, fetch from AI
        const excluded = selectedWords.map(w => w.targetWord).join(', ');
        const response = await fetch('/api/generate-vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLanguage,
            nativeLanguage,
            level,
            category,
            excludedWords: excluded,
            count: BATCH_SIZE
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiWords = data.words.map(w => ({
            ...w,
            id: `ai-${level}-${category}-${w.targetWord}`.replace(/\s+/g, '-').toLowerCase(),
            nativeWord: w.nativeTranslation,
            source: 'ai'
          }));

          // Merge local if any
          const merged = [...matchingLocal, ...aiWords];
          const shuffled = merged.sort(() => 0.5 - Math.random());
          setCandidateVocab(shuffled.slice(0, BATCH_SIZE));
        } else {
          // Fallback to whatever local we have if AI fails
          setCandidateVocab(matchingLocal);
        }
      }
    } catch (err) {
      console.error('Error refreshing batch:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchBatch(allVocab, selectedLevel, selectedCategory);
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    fetchBatch(allVocab, level, selectedCategory);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchBatch(allVocab, selectedLevel, category);
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
    // Load existing to not lose data for words not currently in 'allVocab'
    const storedProgress = JSON.parse(localStorage.getItem('linguStory_vocab_progress') || '{}');
    Object.assign(progress, storedProgress);

    // Update with current sets
    known.forEach(id => {
      progress[id] = { ...progress[id], isKnown: true };
    });
    used.forEach(id => {
      progress[id] = { ...progress[id], hasBeenUsedInStory: true };
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
    const totalKnown = knownWordIds.size;
    const levelTotal = allVocab.filter(i => i.level === selectedLevel).length;
    const levelKnown = allVocab.filter(i => i.level === selectedLevel && knownWordIds.has(i.id)).length;

    return { totalKnown, levelTotal, levelKnown };
  }, [allVocab, knownWordIds, selectedLevel]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        <p className="mt-4 text-on-surface-variant font-body-md">Initializing vocabulary workspace...</p>
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
          <p className="text-on-surface-variant">
            Explore {targetLanguage} vocabulary at {selectedLevel} level.
          </p>
        </div>
        <div className="bg-primary-fixed/30 px-6 py-4 rounded-2xl border border-primary/20">
          <div className="text-label-caps font-bold text-primary mb-1">
            {selectedLevel} {targetLanguage.toUpperCase()} PROGRESS
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-grow h-2 bg-surface-container-highest rounded-full min-w-[150px] overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: stats.levelTotal > 0 ? `${(stats.levelKnown / stats.levelTotal) * 100}%` : '0%' }}
              ></div>
            </div>
            <span className="font-headline-sm text-on-surface">
              {stats.levelKnown} {stats.levelTotal > 0 ? `/ ${stats.levelTotal}` : 'known'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Selection Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant space-y-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 ml-1">Level</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded-xl px-4 py-2 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                >
                  {CEFR_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 ml-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded-xl px-4 py-2 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>
                    {isRefreshing ? 'progress_activity' : 'refresh'}
                  </span>
                  Refresh Candidates
                </button>
              </div>
            </div>

            <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant w-fit ml-auto">
              {['native', 'target', 'both'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${displayMode === mode ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                >
                  {mode === 'native' ? nativeLanguage : mode === 'target' ? targetLanguage : 'Both'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[400px] content-start">
              {candidateVocab.length === 0 && !isRefreshing && (
                <div className="col-span-full py-20 text-center text-on-surface-variant">
                   <p>No candidates found. Try refreshing or changing settings.</p>
                </div>
              )}
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
                        <span className={`font-bold truncate transition-all ${displayMode === 'native' ? 'blur-[3px] select-none opacity-20' : 'text-on-surface'}`}>
                          {word.targetWord}
                        </span>
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase opacity-60">{word.partOfSpeech}</span>
                      </div>
                      <div className={`text-sm truncate transition-all ${displayMode === 'target' ? 'blur-[3px] select-none opacity-20' : 'text-on-surface-variant'}`}>
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
