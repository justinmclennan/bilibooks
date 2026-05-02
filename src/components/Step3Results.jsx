import { useState, useMemo } from 'react';
import { generateSsml, generateReadable, getLineParts, calculatePauseSeconds } from '../utils/ssml';

const Step3Results = ({ formData, storyData, resetApp }) => {
  const [activeTab, setActiveTab] = useState('summary');

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
                          <p className="font-body-lg text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">{line.target}</p>
                          <p className="font-body-md text-on-surface-variant italic">{line.native}</p>
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

const ScriptCard = ({ id, label, ssml, readable, mode, targetFirst, chapters, formData, onCopy, onDownload }) => {
  const [subTab, setSubTab] = useState('preview');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [audioFormat, setAudioFormat] = useState('wav');

  const generateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    try {
      let body = {};
      const isBilingual = mode === 'interlinear';

      if (isBilingual) {
        // Build segments for interlinear stitching
        const segments = [];
        chapters.forEach((chapter, cIdx) => {
          chapter.lines.forEach(line => {
            const parts = getLineParts(line, { mode, targetFirst });
            parts.forEach(p => {
              const pause = p.pause || calculatePauseSeconds(p.text, p.mult);
              segments.push({ type: 'speech', lang: p.lang, text: p.text });
              segments.push({ type: 'pause', duration: parseFloat(pause) });
            });
          });
          if (cIdx < chapters.length - 1) {
            segments.push({ type: 'pause', duration: 2.0 });
          }
        });
        body = { segments, targetLanguage: formData.targetLanguage, baseLanguage: formData.baseLanguage };
      } else {
        // Send SSML for target-only scripts
        if (!ssml || !ssml.includes('<speak>')) {
          throw new Error('No valid SSML available for this script yet.');
        }
        body = { ssml, targetLanguage: formData.targetLanguage };
      }

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audio generation failed');
      }

      const byteCharacters = atob(data.audioContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioFormat(data.format || 'wav');
    } catch (err) {
      console.error(err);
      setAudioError(err.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${id}.${audioFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isBilingual = mode === 'interlinear';
  const hasSsml = ssml && ssml.includes('<speak>');

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="bg-surface-container-low px-lg py-3 flex justify-between items-center border-b border-outline-variant">
        <h4 className="font-headline-sm text-on-surface">
          {label} {isBilingual ? '(Dual Voice)' : '(Target Only)'}
        </h4>
        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            onClick={() => setSubTab('preview')}
            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            PREVIEW
          </button>
          <button
            onClick={() => setSubTab('ssml')}
            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'ssml' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            SSML CODE
          </button>
        </div>
      </div>

      <div className="p-lg">
        <div className="relative mb-lg">
          <pre className="bg-surface-container-low p-md rounded-lg overflow-x-auto text-sm font-mono text-on-surface-variant h-48 no-scrollbar border border-outline-variant">
            {subTab === 'preview' ? readable : ssml}
          </pre>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => onCopy(subTab === 'preview' ? readable : ssml)}
              className="p-2 bg-white/80 backdrop-blur hover:bg-white rounded-lg shadow-sm transition-all material-symbols-outlined text-primary text-sm"
              title="Copy to clipboard"
            >
              content_copy
            </button>
            <button
              onClick={() => onDownload(
                subTab === 'preview' ? readable : ssml,
                `${id}.${subTab === 'preview' ? 'txt' : 'ssml'}`,
                subTab === 'preview' ? 'text/plain' : 'application/ssml+xml'
              )}
              className="p-2 bg-white/80 backdrop-blur hover:bg-white rounded-lg shadow-sm transition-all material-symbols-outlined text-secondary text-sm"
              title="Download file"
            >
              download
            </button>
          </div>
        </div>

        <div className="pt-lg border-t border-outline-variant flex flex-col sm:flex-row items-center gap-lg">
          {!audioUrl && !isGeneratingAudio && (
            <button
              onClick={generateAudio}
              disabled={!isBilingual && !hasSsml}
              className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary rounded-lg font-headline-sm hover:bg-secondary-container transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="material-symbols-outlined">headphones</span>
              {(!isBilingual && !hasSsml) ? 'No SSML Available' : `Generate ${isBilingual ? 'Bilingual ' : ''}Audio`}
            </button>
          )}

          {isGeneratingAudio && (
            <div className="flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span className="font-headline-sm">Generating {isBilingual ? 'Dual-Voice ' : ''}audio...</span>
            </div>
          )}

          {audioUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-md w-full">
              <audio controls src={audioUrl} className="h-10 flex-grow" />
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 px-4 py-2 border-2 border-secondary text-secondary rounded-lg font-label-caps hover:bg-secondary/5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download {audioFormat.toUpperCase()}
              </button>
            </div>
          )}
        </div>

        {audioError && (
          <div className="mt-md p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex items-center gap-md animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="font-body-sm">{audioError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Results;
