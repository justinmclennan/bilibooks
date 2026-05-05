import { useState, useEffect } from 'react';

const LibraryDetail = ({ storyId, onBack }) => {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/library/${storyId}`)
      .then(res => res.json())
      .then(data => {
        setStory(data);
        setLoading(false);
      });
  }, [storyId]);

  if (loading) return <div className="p-xl text-center">Loading story details...</div>;
  if (!story) return <div className="p-xl text-center">Story not found.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-lg pb-xl">
      <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold mb-4">
        <span className="material-symbols-outlined">arrow_back</span> Back to Library
      </button>
      <div className="bg-surface-container-low p-xl rounded-2xl border border-outline-variant">
        <h1 className="font-headline-lg text-primary mb-4">{story.title}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-lg">
          <div><p className="text-[10px] font-bold text-outline uppercase">Languages</p><p className="font-bold">{story.baseLanguage} → {story.targetLanguage}</p></div>
          <div><p className="text-[10px] font-bold text-outline uppercase">Level</p><p className="font-bold">{story.level}</p></div>
          <div><p className="text-[10px] font-bold text-outline uppercase">Chapters</p><p className="font-bold">{story.chapters?.length}</p></div>
          <div><p className="text-[10px] font-bold text-outline uppercase">Words/Ch</p><p className="font-bold">{story.wordsPerChapter}</p></div>
        </div>
        <div className="space-y-8">
          {story.chapters?.map((ch, idx) => (
            <div key={idx} className="space-y-4">
              <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">{ch.chapterTitle}</h3>
              <div className="space-y-4">
                {ch.lines?.map((line, lIdx) => (
                  <div key={lIdx}><p className="font-bold text-on-surface">{line.target}</p><p className="text-on-surface-variant italic text-sm">{line.native}</p></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LibraryDetail;
