import { useState, useEffect } from 'react';
import { getStoryById } from '../utils/library';
import ScriptCard from './ScriptCard';
import Flashcard from './Flashcard';
import ReadAlongPlayer from './ReadAlongPlayer';

const LibraryDetail = ({ storyId, onBack }) => {
  const [story, setStory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [storyViewMode, setStoryViewMode] = useState('target'); // 'target', 'native', 'bilingual'

  useEffect(() => {
    fetchStory();
  }, [storyId]);

  const fetchStory = async () => {
    setIsLoading(true);
    try {
      // 1. Try localStorage first
      let data = getStoryById(storyId);

      // 2. Fallback to API if not found in localStorage (for backward compatibility with old backend saves)
      if (!data) {
        const response = await fetch(`/api/library/${storyId}`);
        if (response.ok) {
          data = await response.json();
        }
      }

      if (!data) throw new Error('Story not found');
      setStory(data);
    } catch (err) {
      console.error(err);
      setError('Could not load story details.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadFile = (text, filename, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-4 w-full">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        <p className="font-headline-sm">Loading story details...</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="p-xl bg-error-container text-on-error-container rounded-2xl border border-error/20 flex flex-col items-center gap-4 w-full">
        <span className="material-symbols-outlined text-4xl">error</span>
        <p className="font-body-lg">{error || 'Story not found'}</p>
        <button onClick={onBack} className="px-6 py-2 bg-error text-on-error rounded-lg font-bold">Back to Library</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-lg animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 mb-lg">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface line-clamp-1">{story.title}</h1>
          <p className="text-on-surface-variant font-body-sm uppercase tracking-widest font-bold">
            {story.targetLanguage} • {story.level} • {story.chapterCount} Chapters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        <div className="md:col-span-8 space-y-lg">
          <div className="flex border-b border-outline-variant overflow-x-auto no-scrollbar bg-surface-container-lowest rounded-t-xl">
            {['summary', 'chapters', 'vocabulary', 'flashcards', 'scripts', 'audio'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-headline-sm capitalize transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
             {activeTab === 'summary' && (
               <div className="space-y-lg animate-in fade-in duration-300">
                 <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                   <h3 className="font-headline-sm text-headline-sm mb-2 flex items-center gap-2 text-primary">
                     <span className="material-symbols-outlined">auto_awesome</span>
                     Story Arc
                   </h3>
                   <p className="text-on-surface-variant leading-relaxed italic">{story.storyArc || "No summary available."}</p>
                 </div>

                 <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                   <h3 className="font-headline-sm text-headline-sm mb-2 flex items-center gap-2 text-primary">
                     <span className="material-symbols-outlined">psychology</span>
                     Story Idea
                   </h3>
                   <p className="text-on-surface-variant leading-relaxed">{story.storyIdea || "No idea provided."}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
                       <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Sentences per chapter</p>
                       <p className="font-headline-sm text-on-surface">{story.sentencesPerChapter || 'N/A'}</p>
                    </div>
                    <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant">
                       <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Style</p>
                       <p className="font-headline-sm text-on-surface uppercase">{story.sentenceLevelStyle}</p>
                    </div>
                 </div>
               </div>
             )}

             {activeTab === 'chapters' && (
               <div className="space-y-8 bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4">
                 <div className="flex justify-end gap-2 mb-4">
                    {['target', 'native', 'bilingual'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setStoryViewMode(mode)}
                        className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all ${storyViewMode === mode ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
                      >
                        {mode}
                      </button>
                    ))}
                 </div>
                 <div className="space-y-12">
                   {story.chapters.map((chapter, cIdx) => (
                     <div key={cIdx} className="space-y-6">
                        <h4 className="font-headline-sm text-primary border-b border-outline-variant pb-2 flex justify-between items-end">
                          <span>Chapter {chapter.chapterNumber}: {chapter.chapterTitle}</span>
                          <span className="text-[10px] font-mono text-on-surface-variant italic mb-0.5">
                            {chapter.actualSentenceCount} sentences • ~{chapter.estimatedTargetWordCount} target words
                          </span>
                        </h4>
                        <div className="space-y-8">
                          {chapter.lines?.map((line, idx) => (
                            <div key={idx} className="group space-y-1">
                              {(storyViewMode === 'target' || storyViewMode === 'bilingual') && (
                                <p className="font-body-lg text-on-surface font-semibold group-hover:text-primary transition-colors">{line.target}</p>
                              )}
                              {(storyViewMode === 'native' || storyViewMode === 'bilingual') && (
                                <p className="font-body-md text-on-surface-variant italic">{line.native}</p>
                              )}
                            </div>
                          ))}
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {activeTab === 'vocabulary' && (
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4">
                  <h3 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-sm">
                    <span className="material-symbols-outlined text-tertiary">quiz</span>
                    Vocabulary List
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {story.vocabulary?.map((item, idx) => {
                      const target = item.termTargetLanguage || item.target;
                      const native = item.termNativeLanguage || item.native;
                      return (
                        <div key={idx} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex justify-between items-center hover:bg-surface-container transition-colors">
                          <span className="font-bold text-primary font-body-md">{target}</span>
                          <span className="text-on-surface-variant font-body-sm">{native}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
             )}

             {activeTab === 'flashcards' && (
               <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4 duration-300 min-h-[500px] flex flex-col justify-center">
                  <Flashcard vocabulary={story.vocabulary} />
               </div>
             )}

             {activeTab === 'scripts' && (
                <div className="space-y-lg animate-in slide-in-from-bottom-4 duration-300">
                  {story.contentVersions ? (
                    ['storyOnly', 'interlinearNativeFirst', 'shadow']
                      .filter(key => story.contentVersions[key])
                      .map((key) => {
                        const data = story.contentVersions[key];
                        const target = story.targetLanguage || 'French';
                        const base = story.baseLanguage || 'English';

                        let displayLabel = data.label;
                        if (key === 'storyOnly') displayLabel = 'STORY - Listen and/or Read';
                        if (key === 'interlinearNativeFirst') displayLabel = `INTERLINEAR - Translate ${base} line to ${target} before the ${target} Speaker, then repeat after ${target} Speaker`;
                        if (key === 'shadow') displayLabel = `SHADOW - Repeat after ${target} Speaker`;

                        return (
                          <ScriptCard
                            key={key}
                            id={key}
                            label={displayLabel}
                            ssml={data.ssml}
                            readable={data.readable}
                            mode={data.mode}
                            targetFirst={data.targetFirst}
                            chapters={story.chapters}
                            formData={story.formData || {
                              targetLanguage: story.targetLanguage,
                              baseLanguage: story.baseLanguage
                            }}
                            onCopy={copyToClipboard}
                            onDownload={downloadFile}
                          />
                        );
                    })
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl border border-dashed border-outline">
                      <span className="material-symbols-outlined text-4xl text-outline mb-4">description</span>
                      <p className="text-on-surface-variant font-headline-sm text-center px-lg">No reusable script data saved. Scripts were likely generated with an older version.</p>
                    </div>
                  )}
                </div>
             )}

             {activeTab === 'audio' && (
               <div className="space-y-lg animate-in slide-in-from-bottom-4">
                 {story.audioFiles?.length > 0 ? (
                    story.audioFiles.map((file, idx) => (
                      <div key={idx} className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-2">
                           <h4 className="font-headline-sm text-on-surface capitalize">
                             {file.id.replace(/([A-Z])/g, ' $1').trim()}
                           </h4>
                           <a
                             href={`/api/library/${storyId}/file/${file.filename}`}
                             download={file.filename}
                             className="text-secondary hover:underline flex items-center gap-1 font-label-caps text-xs"
                           >
                             <span className="material-symbols-outlined text-sm">download</span>
                             Download {file.format.toUpperCase()}
                           </a>
                        </div>
                        <ReadAlongPlayer
                          audioUrl={`/api/library/${storyId}/file/${file.filename}`}
                          chapters={story.chapters}
                          timepoints={file.timepoints}
                        />
                      </div>
                    ))
                 ) : (
                   <div className="py-12 flex flex-col items-center justify-center bg-surface-container-lowest rounded-xl border border-dashed border-outline">
                      <span className="material-symbols-outlined text-4xl text-outline mb-4">volume_off</span>
                      <p className="text-on-surface-variant font-headline-sm">No audio files saved for this story.</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        <div className="md:col-span-4 space-y-lg">
           <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm sticky top-4">
              <h3 className="font-headline-sm text-headline-sm mb-lg text-primary">Export Files</h3>
              <div className="space-y-md">
                 {['storyOnly', 'interlinearNativeFirst', 'shadow'].map(type => (
                   <div key={type} className="flex flex-col gap-2 p-md bg-surface-container-low rounded-xl border border-outline-variant/30">
                      <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                        {type === 'storyOnly' ? 'Story' : type === 'interlinearNativeFirst' ? 'Interlinear' : 'Shadow'}
                      </p>
                      <div className="flex gap-2">
                         <a
                           href={`/api/library/${storyId}/file/${type}.txt`}
                           target="_blank"
                           rel="noreferrer"
                           className="flex-grow flex items-center justify-center gap-2 py-2 bg-primary/5 text-primary rounded-lg font-bold text-[10px] border border-primary/10 hover:bg-primary/10"
                         >
                           <span className="material-symbols-outlined text-sm">description</span>
                           TXT
                         </a>
                         <a
                           href={`/api/library/${storyId}/file/${type}.ssml`}
                           target="_blank"
                           rel="noreferrer"
                           className="flex-grow flex items-center justify-center gap-2 py-2 bg-secondary/5 text-secondary rounded-lg font-bold text-[10px] border border-secondary/10 hover:bg-secondary/10"
                         >
                           <span className="material-symbols-outlined text-sm">terminal</span>
                           SSML
                         </a>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryDetail;
