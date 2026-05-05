import { useState, useEffect } from 'react';

const Library = ({ onViewDetails }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/library')
      .then(res => res.json())
      .then(data => {
        setStories(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-xl text-center">Loading library...</div>;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-lg">
      <h1 className="font-headline-lg text-on-surface">Your Story Library</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {stories.map(story => (
          <div key={story.id} onClick={() => onViewDetails(story.id)} className="bg-surface-container-low p-lg rounded-xl border border-outline-variant hover:shadow-lg transition-all cursor-pointer">
            <h3 className="font-headline-sm text-primary mb-2">{story.title}</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">{story.baseLanguage} → {story.targetLanguage} ({story.level})</p>
            <div className="flex justify-between items-center text-[10px] font-bold text-outline">
              <span>{new Date(story.createdAt).toLocaleDateString()}</span>
              <span>{story.chapters?.length || 0} CHAPTERS</span>
            </div>
          </div>
        ))}
        {stories.length === 0 && <div className="col-span-full text-center p-xl bg-surface-container rounded-xl text-on-surface-variant">No stories saved yet.</div>}
      </div>
    </div>
  );
};

export default Library;
