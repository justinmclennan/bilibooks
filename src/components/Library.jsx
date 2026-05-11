import { useState, useEffect } from 'react';
import { getLibrary, deleteStory } from '../utils/library';

const Library = ({ onViewDetails }) => {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const data = getLibrary();
      setStories(data);
    } catch (err) {
      console.error(err);
      setError('Could not load your library.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this story? This cannot be undone.')) {
      await deleteStory(id);
      fetchLibrary();
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full space-y-lg animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Your Local Library</h1>
          <p className="text-on-surface-variant font-body-md mt-1">Replay and manage your saved language stories.</p>
        </div>
        <button
          onClick={fetchLibrary}
          className="p-2 text-primary hover:bg-primary/5 rounded-full transition-colors material-symbols-outlined"
          title="Refresh Library"
        >
          refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
          <p className="font-headline-sm">Loading your collection...</p>
        </div>
      ) : error ? (
        <div className="p-xl bg-error-container text-on-error-container rounded-2xl border border-error/20 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl">error</span>
          <p className="font-body-lg">{error}</p>
          <button onClick={fetchLibrary} className="px-6 py-2 bg-error text-on-error rounded-lg font-bold">Try Again</button>
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest border border-dashed border-outline rounded-3xl gap-6">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-outline text-4xl">auto_stories</span>
          </div>
          <div className="text-center">
            <h3 className="font-headline-sm text-on-surface">Your library is empty</h3>
            <p className="text-on-surface-variant max-w-xs mt-2">Generate a story and save it to see it appear here for later practice.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {stories.map((story) => (
            <div key={story.id} className="glass-card hover:shadow-xl transition-all group flex flex-col">
              <div className="p-lg flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {story.targetLanguage}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant font-mono">{story.level}</span>
                    <button
                      onClick={(e) => handleDelete(story.id, e)}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors material-symbols-outlined text-sm"
                      title="Delete Story"
                    >
                      delete
                    </button>
                  </div>
                </div>
                <h3 className="font-headline-sm text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-2">{story.title}</h3>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    <span className="text-[11px] font-medium">{formatDate(story.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">layers</span>
                    <span className="text-[11px] font-medium">{story.chapterCount || story.chapters?.length || 0} Chapters</span>
                  </div>
                </div>
              </div>
              <div className="p-md bg-surface-container-low border-t border-outline-variant flex gap-2">
                <button
                  onClick={() => onViewDetails(story.id)}
                  className="flex-grow bg-primary text-on-primary py-2.5 rounded-lg font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-primary-container transition-all"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open Story
                </button>
                {(story.audioFiles?.length > 0 || story.contentVersions) && (
                  <div className="px-3 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center" title="Has Audio/Scripts">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>headphones</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
