import { useState, useMemo } from 'react';
import { generateSsml, generateReadable } from '../utils/ssml';

const Step3Results = ({ formData, storyData, resetApp }) => {
  const [activeTab, setActiveTab] = useState('summary');

  const contentVersions = useMemo(() => {
    if (!storyData || !storyData.lines) return {};
    const configs = [
      { id: 'interlinearTargetFirst', label: 'Interlinear (Target First)', mode: 'interlinear', targetFirst: true },
      { id: 'interlinearNativeFirst', label: 'Interlinear (Native First)', mode: 'interlinear', targetFirst: false },
      { id: 'shadow', label: 'Shadow Script', mode: 'shadow' },
      { id: 'storyOnly', label: 'Story Only', mode: 'story' },
    ];

    return configs.reduce((acc, config) => {
      acc[config.id] = {
        label: config.label,
        ssml: generateSsml(storyData.lines, { mode: config.mode, targetFirst: config.targetFirst }),
        readable: generateReadable(storyData.lines, { mode: config.mode, targetFirst: config.targetFirst }),
      };
      return acc;
    }, {});
  }, [storyData]);

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md animate-in fade-in duration-300">
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-primary mb-sm">translate</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LANGUAGES</p>
                <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.baseLanguage} → {formData.targetLanguage}</p>
              </div>
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-primary mb-sm">signal_cellular_alt</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LEVEL</p>
                <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.level}</p>
              </div>
              <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <span className="material-symbols-outlined text-primary mb-sm">timer</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">CHAPTER</p>
                <p className="font-body-lg text-body-lg font-bold text-on-surface">Chapter 1</p>
              </div>
            </div>
          )}

          {activeTab === 'story' && (
            <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-headline-sm text-headline-sm mb-lg flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">description</span>
                {storyData?.title || "Your Story"}
              </h3>
              <div className="space-y-8">
                {storyData?.lines?.map((line, idx) => (
                  <div key={idx} className="group">
                    <p className="font-body-lg text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">{line.target}</p>
                    <p className="font-body-md text-on-surface-variant italic">{line.native}</p>
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

const ScriptCard = ({ id, label, ssml, readable, onCopy, onDownload }) => {
  const [subTab, setSubTab] = useState('preview');

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="bg-surface-container-low px-lg py-3 flex justify-between items-center border-b border-outline-variant">
        <h4 className="font-headline-sm text-on-surface">{label}</h4>
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
        <div className="relative">
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
      </div>
    </div>
  );
};

export default Step3Results;
