import { useState, useMemo } from 'react';

const Step3Results = ({ formData, storyData, resetApp, libraryItemId }) => {
  const [activeTab, setActiveTab] = useState('story');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const chapters = storyData?.chapters || [];

  const scriptVersions = useMemo(() => {
    if (!storyData) return [];
    return [
      { id: 'storyTarget', label: 'Story (Target)', content: storyData.storyTargetLanguage },
      { id: 'storyNative', label: 'Story (Native)', content: storyData.storyNativeLanguage },
      { id: 'interlinearTargetFirst', label: 'Interlinear (Target First)', content: storyData.interlinearTargetFirst },
      { id: 'interlinearNativeFirst', label: 'Interlinear (Native First)', content: storyData.interlinearNativeFirst },
      { id: 'shadow', label: 'Shadow Script', content: storyData.shadowTargetOnly },
      { id: 'ssml', label: 'SSML Script', content: storyData.ssmlScript, isCode: true },
    ];
  }, [storyData]);

  const handleGenerateAudio = async (type) => {
    setIsGeneratingAudio(true);
    try {
      let body = {};
      if (type === 'mp3') {
        body = { ssml: storyData.ssmlScript, targetLanguage: formData.targetLanguage, libraryItemId, scriptType: 'story-only' };
      } else {
        // Simple segments for now, matching the scriptUtils logic would be better but requires more complex reconstruction
        const segments = [];
        chapters.forEach(c => {
          c.lines.forEach(l => {
             segments.push({ type: 'speech', text: l.target, lang: 'target' });
             segments.push({ type: 'pause', duration: 1.0 });
             segments.push({ type: 'speech', text: l.native, lang: 'native' });
             segments.push({ type: 'pause', duration: 1.5 });
          });
        });
        body = { segments, targetLanguage: formData.targetLanguage, baseLanguage: formData.baseLanguage, libraryItemId, scriptType: 'interlinear' };
      }

      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const blob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="w-full space-y-lg pb-xl">
      <div className="flex justify-between items-center bg-secondary-container/20 p-lg rounded-xl border border-secondary-container/40">
        <h2 className="font-headline-sm">Your stories are ready!</h2>
        <button onClick={resetApp} className="bg-primary text-on-primary px-6 py-2 rounded-lg">Start New</button>
      </div>

      {storyData?.allPassed === false && (
        <div className="p-md bg-error-container/10 border border-error/20 rounded-xl text-error text-sm">
          Note: This story may not fully match all selected settings.
          <ul className="list-disc list-inside mt-1">
            {chapters.flatMap(c => c.validationWarnings || []).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-4 border-b border-outline-variant overflow-x-auto no-scrollbar">
        {['story', 'vocabulary', 'scripts', 'audio'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant'}`}>{tab}</button>
        ))}
      </div>

      <div className="bg-surface-container-low p-lg rounded-xl min-h-[400px]">
        {activeTab === 'story' && (
          <div className="space-y-8">
            <h2 className="font-headline-md text-primary">{storyData?.title}</h2>
            {chapters.map((ch, i) => (
              <div key={i} className="space-y-4">
                <h3 className="font-bold text-on-surface border-b pb-1">{ch.chapterTitle}</h3>
                {ch.lines?.map((l, j) => (
                  <div key={j} className="hover:bg-primary/5 p-2 rounded transition-colors group">
                    <p className="font-bold text-on-surface group-hover:text-primary">{l.target}</p>
                    <p className="text-on-surface-variant text-sm italic">{l.native}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storyData?.vocabularyList?.map((v, i) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-outline-variant flex justify-between shadow-sm">
                <span className="font-bold text-primary">{v.target}</span>
                <span className="text-on-surface-variant">{v.native}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="space-y-lg">
            {scriptVersions.map(s => (
              <div key={s.id} className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-outline">{s.label}</h4>
                <pre className={`p-4 bg-surface-container rounded-lg overflow-x-auto text-xs ${s.isCode ? 'font-mono' : 'whitespace-pre-wrap font-body-sm'}`}>
                  {s.content}
                </pre>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-lg">
            <div className="flex flex-wrap gap-4">
              <button onClick={() => handleGenerateAudio('mp3')} disabled={isGeneratingAudio} className="bg-secondary text-on-secondary px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:bg-secondary-container transition-all">
                <span className="material-symbols-outlined">headphones</span> Generate MP3
              </button>
              <button onClick={() => handleGenerateAudio('wav')} disabled={isGeneratingAudio} className="bg-white border-2 border-secondary text-secondary px-6 py-3 rounded-xl flex items-center gap-2 shadow-md hover:bg-secondary/5 transition-all">
                <span className="material-symbols-outlined">translate</span> Generate Dual-Voice
              </button>
            </div>
            {isGeneratingAudio && (
              <div className="flex items-center gap-3 text-secondary animate-pulse">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <p className="font-bold">Generating audio package...</p>
              </div>
            )}
            {audioUrl && (
              <div className="p-lg bg-white rounded-xl border border-secondary/20 shadow-inner">
                <p className="text-xs font-bold text-secondary mb-2 uppercase">Preview Player</p>
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Results;
