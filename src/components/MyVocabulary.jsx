import { useState, useEffect, useMemo } from 'react';

const MyVocabulary = ({ onUseSelectedWords }) => {
  const [vocabList, setVocabList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [displayMode, setDisplayMode] = useState('both'); // 'english', 'french', 'both'
  const [selectedWords, setSelectedWords] = useState(new Set());

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
        const response = await fetch('/vocabulary_b1_french.csv');
        if (!response.ok) throw new Error('Failed to fetch vocabulary file');
        const text = await response.text();
        const rawData = parseCSV(text);

        // Load progress from localStorage
        const storedProgress = JSON.parse(localStorage.getItem('linguStory_vocab_progress') || '{}');

        // Convert to internal structure
        const structuredData = rawData.map(item => {
          const id = `b1-fr-${item.category}-${item.nativeWord}-${item.targetWord}`.replace(/\s+/g, '-').toLowerCase();
          const progress = storedProgress[id] || { isKnown: false, hasBeenUsedInStory: false };

          return {
            id,
            category: item.category,
            nativeWord: item.nativeWord,
            targetWord: item.targetWord,
            partOfSpeech: item.partOfSpeech || '',
            isKnown: progress.isKnown,
            hasBeenUsedInStory: progress.hasBeenUsedInStory
          };
        });

        setVocabList(structuredData);
      } catch (err) {
        console.error('Error loading vocabulary:', err);
        setError('Failed to load vocabulary. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVocab();
  }, []);

  const saveProgress = (list) => {
    const progress = {};
    list.forEach(item => {
      progress[item.id] = {
        isKnown: item.isKnown,
        hasBeenUsedInStory: item.hasBeenUsedInStory
      };
    });
    localStorage.setItem('linguStory_vocab_progress', JSON.stringify(progress));
  };

  const toggleKnown = (id) => {
    const newList = vocabList.map(item =>
      item.id === id ? { ...item, isKnown: !item.isKnown } : item
    );
    setVocabList(newList);
    saveProgress(newList);
  };

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedWords(newSelection);
  };

  const categories = useMemo(() => {
    const cats = [...new Set(vocabList.map(item => item.category))];
    return cats.sort();
  }, [vocabList]);

  const stats = useMemo(() => {
    const total = vocabList.length;
    const known = vocabList.filter(i => i.isKnown).length;

    const catStats = categories.reduce((acc, cat) => {
      const items = vocabList.filter(i => i.category === cat);
      acc[cat] = {
        total: items.length,
        known: items.filter(i => i.isKnown).length
      };
      return acc;
    }, {});

    return { total, known, catStats };
  }, [vocabList, categories]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        <p className="mt-4 text-on-surface-variant font-body-md">Loading B1 French vocabulary...</p>
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

  const currentCategoryWords = vocabList.filter(item => item.category === selectedCategory);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">My Vocabulary</h1>
          <p className="text-on-surface-variant">Track your progress and practice B1 French words.</p>
        </div>
        <div className="bg-primary-fixed/30 px-6 py-4 rounded-2xl border border-primary/20">
          <div className="text-label-caps font-bold text-primary mb-1">B1 PROGRESS</div>
          <div className="flex items-center gap-4">
            <div className="flex-grow h-2 bg-surface-container-highest rounded-full min-w-[120px] overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(stats.known / stats.total) * 100}%` }}
              ></div>
            </div>
            <span className="font-headline-sm text-on-surface">{stats.known} / {stats.total}</span>
          </div>
        </div>
      </header>

      {/* Categories View */}
      {!selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const catStat = stats.catStats[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl text-left hover:shadow-md hover:border-primary/50 transition-all group"
              >
                <h3 className="font-headline-sm text-on-surface mb-2 capitalize">{cat}</h3>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-grow mr-4">
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all"
                        style={{ width: `${(catStat.known / catStat.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-label-caps font-bold text-on-surface-variant">
                    {catStat.known}/{catStat.total}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-primary font-bold hover:underline"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Categories
            </button>

            <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant">
              <button
                onClick={() => setDisplayMode('english')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${displayMode === 'english' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
              >
                ENGLISH
              </button>
              <button
                onClick={() => setDisplayMode('french')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${displayMode === 'french' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
              >
                FRENCH
              </button>
              <button
                onClick={() => setDisplayMode('both')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${displayMode === 'both' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
              >
                BOTH
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex items-center justify-between">
               <h2 className="font-headline-md text-on-surface capitalize">{selectedCategory}</h2>
               <span className="text-label-caps font-bold text-on-surface-variant">
                 {stats.catStats[selectedCategory].known} / {stats.catStats[selectedCategory].total} known
               </span>
            </div>

            <div className="divide-y divide-outline-variant">
              {currentCategoryWords.map(word => (
                <div
                  key={word.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors ${word.isKnown ? 'bg-emerald-50/30' : 'hover:bg-surface-container-low/50'}`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={word.isKnown}
                      onChange={() => toggleKnown(word.id)}
                      className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>

                  <div
                    className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2 cursor-pointer"
                    onClick={() => !word.isKnown && toggleSelection(word.id)}
                  >
                    <div className="flex flex-col">
                      <span className={`font-bold transition-all ${displayMode === 'english' ? 'blur-sm select-none opacity-20' : 'text-primary'}`}>
                        {word.targetWord}
                      </span>
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold">{word.partOfSpeech}</span>
                    </div>
                    <div className="flex flex-col md:items-end md:text-right">
                      <span className={`font-medium transition-all ${displayMode === 'french' ? 'blur-sm select-none opacity-20' : 'text-on-surface'}`}>
                        {word.nativeWord}
                      </span>
                      {word.hasBeenUsedInStory && (
                        <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold w-fit md:ml-auto mt-1">
                          Used in story
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {!word.isKnown && (
                      <button
                        onClick={() => toggleSelection(word.id)}
                        className={`material-symbols-outlined rounded-full p-2 transition-all ${selectedWords.has(word.id) ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-low'}`}
                      >
                        {selectedWords.has(word.id) ? 'check_circle' : 'add_circle'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedWords.size > 0 && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-primary/30 px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 z-50">
              <div className="text-on-surface font-bold">
                {selectedWords.size} word{selectedWords.size > 1 ? 's' : ''} selected
              </div>
              <button
                onClick={() => {
                   const words = vocabList.filter(w => selectedWords.has(w.id));
                   // Update used-in-story status
                   const newList = vocabList.map(item =>
                     selectedWords.has(item.id) ? { ...item, hasBeenUsedInStory: true } : item
                   );
                   setVocabList(newList);
                   saveProgress(newList);
                   onUseSelectedWords(words);
                }}
                className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                Use in a story
                <span className="material-symbols-outlined">auto_awesome</span>
              </button>
              <button
                onClick={() => setSelectedWords(new Set())}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyVocabulary;
