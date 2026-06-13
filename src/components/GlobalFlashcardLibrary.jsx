import { useState, useMemo, useEffect } from 'react';
import { getGlobalFlashcards, updateFlashcardStatus } from '../utils/flashcards';
import Flashcard from './Flashcard';

const GlobalFlashcardLibrary = () => {
  const [flashcards, setFlashcards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterStory, setFilterStory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' or 'stillLearning'

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = () => {
    const cards = getGlobalFlashcards();
    setFlashcards(cards);
  };

  const filteredCards = useMemo(() => {
    return flashcards.filter(card => {
      const matchesSearch =
        card.termTargetLanguage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.termNativeLanguage.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLanguage = filterLanguage === 'all' || card.targetLanguage === filterLanguage;
      const matchesStory = filterStory === 'all' || card.sourceStoryId === filterStory;
      const matchesStatus = filterStatus === 'all' || card.reviewStatus === filterStatus;

      return matchesSearch && matchesLanguage && matchesStory && matchesStatus;
    });
  }, [flashcards, searchTerm, filterLanguage, filterStory, filterStatus]);

  const languages = useMemo(() => {
    const langs = new Set(flashcards.map(c => c.targetLanguage));
    return ['all', ...Array.from(langs)];
  }, [flashcards]);

  const stories = useMemo(() => {
    const storyMap = new Map();
    flashcards.forEach(c => {
      if (!storyMap.has(c.sourceStoryId)) {
        storyMap.set(c.sourceStoryId, c.sourceStoryTitle);
      }
    });
    return storyMap;
  }, [flashcards]);

  const cardsToReview = useMemo(() => {
    if (reviewFilter === 'stillLearning') {
      return filteredCards.filter(c => c.reviewStatus === 'stillLearning');
    }
    return filteredCards;
  }, [filteredCards, reviewFilter]);

  const handleUpdateStatus = (cardId, newStatus) => {
    updateFlashcardStatus(cardId, newStatus);
    loadFlashcards(); // Reload to update UI
  };

  if (reviewMode) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setReviewMode(false)}
            className="flex items-center gap-2 text-primary font-bold hover:underline"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Library
          </button>
          <div className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
            Reviewing {reviewFilter === 'stillLearning' ? 'Still Learning' : 'Filtered'} Cards
          </div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm min-h-[500px] flex flex-col justify-center">
          {cardsToReview.length > 0 ? (
            <Flashcard
              vocabulary={cardsToReview}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : (
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-outline">auto_awesome</span>
              <p className="text-on-surface-variant font-headline-sm">No cards match your current review filter.</p>
              <button
                onClick={() => setReviewMode(false)}
                className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Flashcard Library</h1>
          <p className="text-on-surface-variant">Review vocabulary from all your stories in one place.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setReviewFilter('all'); setReviewMode(true); }}
            disabled={filteredCards.length === 0}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            Review All ({filteredCards.length})
          </button>
          <button
            onClick={() => { setReviewFilter('stillLearning'); setReviewMode(true); }}
            disabled={filteredCards.filter(c => c.reviewStatus === 'stillLearning').length === 0}
            className="bg-secondary text-on-secondary px-6 py-3 rounded-xl font-bold shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            Review Still Learning ({filteredCards.filter(c => c.reviewStatus === 'stillLearning').length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-sm">search</span>
            <input
              type="text"
              placeholder="Search terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border-outline-variant rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">Language</label>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="w-full bg-surface-container-lowest border-outline-variant rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang === 'all' ? 'All Languages' : lang}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">Story</label>
          <select
            value={filterStory}
            onChange={(e) => setFilterStory(e.target.value)}
            className="w-full bg-surface-container-lowest border-outline-variant rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            <option value="all">All Stories</option>
            {Array.from(stories.entries()).map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pl-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-surface-container-lowest border-outline-variant rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="stillLearning">Still Learning</option>
            <option value="known">Known</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCards.map(card => (
            <div
              key={card.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
                  card.reviewStatus === 'known' ? 'bg-emerald-100 text-emerald-700' :
                  card.reviewStatus === 'stillLearning' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {card.reviewStatus.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">{card.targetLanguage}</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-1">{card.termTargetLanguage}</h3>
              <p className="text-on-surface font-semibold mb-4">{card.termNativeLanguage}</p>
              <div className="pt-4 border-t border-outline-variant/50 space-y-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                   <span className="material-symbols-outlined text-sm">auto_stories</span>
                   <span className="text-[10px] font-bold uppercase truncate">{card.sourceStoryTitle}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                   <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
                   <span className="text-[10px] font-bold uppercase">{card.level}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 bg-surface-container-lowest rounded-3xl border-2 border-dashed border-outline-variant">
          <span className="material-symbols-outlined text-6xl text-outline">inventory_2</span>
          <p className="text-on-surface-variant font-headline-sm">No flashcards found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default GlobalFlashcardLibrary;
