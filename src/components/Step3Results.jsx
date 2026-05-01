import { useState, useMemo } from 'react';
import {
  generateInterlinearSsml,
  generateShadowSsml,
  generateStoryOnlySsml
} from '../utils/ssml';

const Step3Results = ({ formData, storyData, resetApp }) => {
  const [activeTab, setActiveTab] = useState('summary');

  const ssmlVersions = useMemo(() => {
    if (!storyData || !storyData.lines) return {};
    return {
      interlinearTargetFirst: generateInterlinearSsml(storyData.lines, { targetFirst: true }),
      interlinearNativeFirst: generateInterlinearSsml(storyData.lines, { targetFirst: false }),
      shadow: generateShadowSsml(storyData.lines),
      storyOnly: generateStoryOnlySsml(storyData.lines),
    };
  }, [storyData]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadSsml = (text, filename) => {
    const blob = new Blob([text], { type: 'application/ssml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloads = [
    { name: 'Interlinear (Target First)', key: 'interlinearTargetFirst', icon: 'translate', color: 'primary' },
    { name: 'Interlinear (Native First)', key: 'interlinearNativeFirst', icon: 'translate', color: 'primary' },
    { name: 'Shadow Script', key: 'shadow', icon: 'record_voice_over', color: 'primary' },
    { name: 'Story Only', key: 'storyOnly', icon: 'menu_book', color: 'secondary' },
    { name: 'Vocab List', key: 'vocab', icon: 'quiz', color: 'tertiary' },
  ];

  const colorClasses = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', hover: 'hover:bg-primary/5' },
    secondary: { bg: 'bg-secondary/10', text: 'text-secondary', hover: 'hover:bg-secondary/5' },
    tertiary: { bg: 'bg-tertiary/10', text: 'text-tertiary', hover: 'hover:bg-tertiary/5' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg w-full">
      {/* Left Side: Main Content */}
      <div className="md:col-span-8 space-y-lg">
        {/* Tabs */}
        <div className="flex border-b border-outline-variant overflow-x-auto no-scrollbar">
          {['summary', 'story', 'vocabulary', 'ssml'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-headline-sm capitalize transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-primary mb-sm">translate</span>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LANGUAGES</p>
              <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.baseLanguage} → {formData.targetLanguage}</p>
            </div>
            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-primary mb-sm">signal_cellular_alt</span>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LEVEL</p>
              <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.level}</p>
            </div>
            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-primary mb-sm">timer</span>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">CHAPTER</p>
              <p className="font-body-lg text-body-lg font-bold text-on-surface">Chapter 1</p>
            </div>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">description</span>
              {storyData?.title || "Your Story"}
            </h3>
            <div className="space-y-6">
              {storyData?.lines?.map((line, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="font-body-md text-on-surface font-semibold">{line.target}</p>
                  <p className="font-body-sm text-on-surface-variant italic">{line.native}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-tertiary">quiz</span>
              Vocabulary List
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {storyData?.vocabularyList?.map((item, idx) => (
                <div key={idx} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex justify-between items-center">
                  <span className="font-bold text-primary">{item.target}</span>
                  <span className="text-on-surface-variant">{item.native}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ssml' && (
          <div className="space-y-lg">
            {Object.entries(ssmlVersions).map(([key, ssml]) => (
              <div key={key} className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
                <div className="flex justify-between items-center mb-md">
                  <h4 className="font-headline-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(ssml)}
                      className="p-2 hover:bg-surface-container rounded-full transition-colors material-symbols-outlined text-primary"
                    >
                      content_copy
                    </button>
                    <button
                      onClick={() => downloadSsml(ssml, `${key}.ssml`)}
                      className="p-2 hover:bg-surface-container rounded-full transition-colors material-symbols-outlined text-secondary"
                    >
                      download
                    </button>
                  </div>
                </div>
                <pre className="bg-surface-container-low p-md rounded-lg overflow-x-auto text-xs font-mono text-on-surface-variant max-h-60 no-scrollbar">
                  {ssml}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Downloads & Actions */}
      <div className="md:col-span-4 space-y-lg">
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-lg">Available Assets</h3>
          <div className="space-y-md">
            {downloads.map((item) => {
              const classes = colorClasses[item.color];
              const content = item.key === 'vocab' ? JSON.stringify(storyData?.vocabularyList, null, 2) : ssmlVersions[item.key];
              const extension = item.key === 'vocab' ? 'json' : 'ssml';

              return (
                <div key={item.key} className="flex items-center justify-between p-md bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-all">
                  <div className="flex items-center gap-md">
                    <div className={`w-10 h-10 ${classes.bg} ${classes.text} rounded flex items-center justify-center`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <p className="font-body-md font-semibold text-on-surface">{item.name}</p>
                  </div>
                  <button
                    onClick={() => downloadSsml(content, `${item.key}.${extension}`)}
                    className={`material-symbols-outlined ${classes.text} ${classes.hover} p-2 rounded-full transition-colors`}
                  >
                    download
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-xl flex flex-col gap-md">
            <button
              onClick={resetApp}
              className="w-full bg-primary text-on-primary py-md rounded-lg font-headline-sm shadow-md hover:bg-primary-container transition-all"
            >
              Start New Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Results;
