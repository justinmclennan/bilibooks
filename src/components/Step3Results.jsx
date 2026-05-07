import { useState, useMemo } from 'react';
import { generateSsml, generateReadable } from '../utils/ssml';
import ScriptCard from './ScriptCard';
import { saveStory } from '../utils/library';

const Step3Results = ({ formData, storyData, resetApp, libraryItemId, onLibraryIdUpdate }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState({}); // { id: { audioContent, format } }

  const chapters = useMemo(() => {
    if (!storyData) return [];
    if (storyData.chapters) return storyData.chapters;
    if (storyData.lines) return [{ lines: storyData.lines }];
    return [];
  }, [storyData]);

  const contentVersions = useMemo(() => {
    if (!storyData || chapters.length === 0) return {};
    const configs = [
      { id: 'interlinearTargetFirst', label: 'Interlinear (Target First)', mode: 'interlinear', targetFirst: true },
      { id: 'interlinearNativeFirst', label: 'Interlinear (Native First)', mode: 'interlinear', targetFirst: false },
      { id: 'shadow', label: 'Shadow Script', mode: 'shadow' },
      { id: 'storyOnly', label: 'Story Only', mode: 'story' },
    ];

    return configs.reduce((acc, config) => {
      acc[config.id] = {
        label: config.label,
        mode: config.mode,
        targetFirst: config.targetFirst,
        ssml: generateSsml(chapters, { mode: config.mode, targetFirst: config.targetFirst }),
        readable: generateReadable(chapters, { mode: config.mode, targetFirst: config.targetFirst }),
      };
      return acc;
    }, {});
  }, [storyData, chapters]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleSaveToLibrary = async () => {
    setIsSaving(true);
    try {
      // 1. Save to localStorage (Required)
      saveStory(storyData, formData, contentVersions);

      // 2. Also attempt to save to backend (Original behavior preserved)
      const audioFilesArray = Object.entries(generatedAudio).map(([id, data]) => ({
        id,
        audioContent: data.audioContent,
        format: data.format
      }));

      try {
        await fetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyData,
            formData,
            contentVersions,
            audioFiles: audioFilesArray
          }),
        });
      } catch (backendErr) {
        console.warn('Backend save failed, but localStorage save succeeded.', backendErr);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error saving to library: ' + err.message);
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg w-full">
      {/* Left Side: Main Content */}
      <div className="md:col-span-8 space-y-lg">
        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant overflow-x-auto no-scrollbar bg-surface-container-lowest rounded-t-xl">
          {['summary', 'story', 'vocabulary', 'scripts'].map((tab) => (
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-primary mb-sm">translate</span>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LANGUAGES</p>
                  <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.baseLanguage} → {formData.targetLanguage}</p>
                </div>
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-primary mb-sm">signal_cellular_alt</span>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LEVEL</p>
                  <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.level} ({formData.sentenceLevelStyle})</p>
                </div>
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-primary mb-sm">auto_stories</span>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">CHAPTERS</p>
                  <p className="font-body-lg text-body-lg font-bold text-on-surface">{chapters.length} Chapters</p>
                </div>
              </div>

              {storyData?.storyArc && (
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                  <h3 className="font-headline-sm text-headline-sm mb-2 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Story Arc
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed italic">{storyData.storyArc}</p>
                </div>
              )}

              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <h3 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-2 text-primary">
                   <span className="material-symbols-outlined">assignment</span>
                   Curriculum Plan
                </h3>
                <div className="space-y-4">
                  {chapters.map((chapter, idx) => (
                    <div key={idx} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-col">
                           <h4 className="font-bold text-on-surface">Chapter {chapter.chapterNumber}: {chapter.chapterTitle}</h4>
                           {!chapter.validationPassed && (
                             <span className="text-[10px] text-error font-bold flex items-center gap-1">
                               <span className="material-symbols-outlined text-xs">warning</span>
                               Incomplete Alignment
                             </span>
                           )}
                         </div>
                         <div className="flex gap-2">
                           {chapter.estimatedTargetWordCount && (
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${chapter.validationPassed ? 'text-on-surface-variant bg-surface-container border-outline-variant' : 'text-error bg-error-container border-error/20'}`}>
                               {chapter.estimatedTargetWordCount} WORDS
                             </span>
                           )}
                         </div>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mb-3">{chapter.storyPurpose}</p>
                      <div className="flex flex-wrap gap-2">
                        {chapter.newFocusWords?.map((w, i) => (
                          <span key={i} className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase">New: {w}</span>
                        ))}
                        {chapter.reviewWords?.map((w, i) => (
                          <span key={i} className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase">Review: {w}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'story' && (
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">description</span>
                {storyData?.title || "Your Story"}
              </h3>
              <div className="space-y-12">
                {chapters.map((chapter, cIdx) => (
                  <div key={cIdx} className="space-y-6">
                    {chapter.chapterTitle && (
                      <h4 className="font-headline-sm text-primary border-b border-outline-variant pb-2">
                        {chapter.chapterTitle}
                      </h4>
                    )}
                    <div className="space-y-8">
                      {chapter.lines?.map((line, idx) => (
                        <div key={idx} className="group">
                          <p className="font-body-lg text-on-surface font-semibold group-hover:text-primary transition-colors">{line.target}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vocabulary' && (
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-sm">
                <span className="material-symbols-outlined text-tertiary">quiz</span>
                Vocabulary List
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {storyData?.vocabularyList?.map((item, idx) => (
                  <div key={idx} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex justify-between items-center hover:bg-surface-container transition-colors">
                    <span className="font-bold text-primary font-body-md">{item.target}</span>
                    <span className="text-on-surface-variant font-body-sm">{item.native}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scripts' && (
            <div className="space-y-lg animate-in slide-in-from-bottom-4 duration-300">
              {Object.entries(contentVersions).map(([key, data]) => (
                <ScriptCard
                  key={key}
                  id={key}
                  label={data.label}
                  ssml={data.ssml}
                  readable={data.readable}
                  mode={data.mode}
                  targetFirst={data.targetFirst}
                  chapters={chapters}
                  formData={formData}
                  onCopy={copyToClipboard}
                  onDownload={downloadFile}
                  onAudioGenerated={(audioData) => setGeneratedAudio(prev => ({ ...prev, [key]: audioData }))}
                  libraryItemId={libraryItemId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Quick Actions */}
      <div className="md:col-span-4 space-y-lg">
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm sticky top-4">
          <h3 className="font-headline-sm text-headline-sm mb-lg">Actions</h3>
          <div className="space-y-md">
             <button
              onClick={() => handleSaveToLibrary()}
              disabled={isSaving || saveSuccess}
              className={`w-full flex items-center justify-between p-md rounded-xl border transition-all ${
                saveSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-surface-container-low border-transparent hover:border-outline-variant text-on-surface'
              }`}
            >
              <div className="flex items-center gap-md">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${saveSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                  <span className="material-symbols-outlined">{saveSuccess ? 'check_circle' : 'bookmark_add'}</span>
                </div>
                <p className="font-body-md font-semibold">{saveSuccess ? 'Saved to Library' : 'Save to Library'}</p>
              </div>
              {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            </button>

             <button
              onClick={() => downloadFile(JSON.stringify(storyData, null, 2), 'story_data.json', 'application/json')}
              className="w-full flex items-center justify-between p-md bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant transition-all"
            >
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">data_object</span>
                </div>
                <p className="font-body-md font-semibold text-on-surface">Raw JSON Data</p>
              </div>
              <span className="material-symbols-outlined text-tertiary">download</span>
            </button>
          </div>
          <div className="mt-xl">
            <button
              onClick={resetApp}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-sm shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Start New Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Step3Results;
