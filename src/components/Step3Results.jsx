
const Step3Results = ({ formData, storyData, resetApp }) => {
  const downloads = [
    { name: 'Story Script', type: 'PDF • 1.2 MB', icon: 'menu_book', color: 'primary', content: storyData?.storyTargetLanguage },
    { name: 'Interlinear Script', type: 'PDF • 1.5 MB', icon: 'translate', color: 'primary', content: storyData?.interlinearTargetFirst },
    { name: 'Shadow Script', type: 'PDF • 1.1 MB', icon: 'record_voice_over', color: 'primary', content: storyData?.shadowTargetOnly },
    { name: 'Vocab Flashcards', type: 'CSV • 200 KB', icon: 'quiz', color: 'tertiary', content: JSON.stringify(storyData?.vocabularyList) },
  ];

  // Map of colors to avoid dynamic class issues with JIT
  const colorClasses = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      hover: 'hover:bg-primary/5',
    },
    secondary: {
      bg: 'bg-secondary/10',
      text: 'text-secondary',
      hover: 'hover:bg-secondary/5',
    },
    tertiary: {
      bg: 'bg-tertiary/10',
      text: 'text-tertiary',
      hover: 'hover:bg-tertiary/5',
    },
  };

  const handleGenerateAudio = async (mode) => {
    try {
      const lines = storyData.audioDrillLines.filter(line => {
        if (mode === 'shadow') return line.type === 'fr_shadow';
        return line.type !== 'fr_shadow';
      });

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lines,
          mode,
          voiceId: formData.targetLanguage === 'French' ? 'Lea' : 'Lucia', // Example voice logic
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();

      // Also provide a way to download it
      const a = document.createElement('a');
      a.href = url;
      a.download = `lingu_story_${mode}_audio.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Audio Generation Error:', error);
      alert(error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg w-full">
      {/* Left Side: Summary & Preview */}
      <div className="md:col-span-8 space-y-lg">
        {/* Summary Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-primary mb-sm">translate</span>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LANGUAGES</p>
            <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.baseLanguage} → {formData.targetLanguage}</p>
          </div>
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-primary mb-sm">signal_cellular_alt</span>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">LEVEL</p>
            <p className="font-body-lg text-body-lg font-bold text-on-surface">{formData.level}</p>
          </div>
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-primary mb-sm">timer</span>
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">DURATION</p>
            <p className="font-body-lg text-body-lg font-bold text-on-surface">12 Minutes</p>
          </div>
        </div>

        {/* Story Content Card */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-md flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">description</span>
              {storyData?.title || "Your Generated Story"}
            </div>
          </h3>
          <div className="space-y-4">
             <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant italic text-on-surface-variant text-body-sm">
               {formData.storyIdea || "A custom generated story based on your preferences."}
             </div>
             <div className="whitespace-pre-wrap font-body-md text-on-surface leading-relaxed">
               {storyData?.storyTargetLanguage || "No story content available."}
             </div>
          </div>
        </div>

        {/* Vocabulary List */}
        {storyData?.vocabularyList && (
           <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
             <h3 className="font-headline-sm text-headline-sm mb-md flex items-center gap-sm">
               <span className="material-symbols-outlined text-tertiary">quiz</span>
               Key Vocabulary
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {storyData.vocabularyList.map((item, index) => (
                 <div key={index} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-bold text-primary">{item.term}</span>
                     <span className="text-body-xs text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-full">{item.translation}</span>
                   </div>
                   <p className="text-body-sm text-on-surface-variant italic">{item.explanation}</p>
                 </div>
               ))}
             </div>
           </div>
        )}

        {/* Audio Player Section */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[80px]">headphones</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm mb-lg">Audio Drills</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <button
              onClick={() => handleGenerateAudio('interlinear')}
              className="flex items-center gap-md p-lg bg-primary-fixed/20 border border-primary/20 rounded-xl hover:bg-primary-fixed/30 transition-all text-left"
            >
              <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined">translate</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Interlinear Audio</p>
                <p className="text-body-xs text-on-surface-variant">Bilingual practice with pauses</p>
              </div>
            </button>

            <button
              onClick={() => handleGenerateAudio('shadow')}
              className="flex items-center gap-md p-lg bg-secondary-fixed/20 border border-secondary/20 rounded-xl hover:bg-secondary-fixed/30 transition-all text-left"
            >
              <div className="w-12 h-12 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined">record_voice_over</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Shadow Audio</p>
                <p className="text-body-xs text-on-surface-variant">Target language only practice</p>
              </div>
            </button>
          </div>

          <p className="mt-lg text-xs text-on-surface-variant italic text-center">Powered by Amazon Polly Neural voices.</p>
        </div>
      </div>

      {/* Right Side: Download List & Actions */}
      <div className="md:col-span-4 space-y-lg">
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <h3 className="font-headline-sm text-headline-sm mb-lg">Downloadable Items</h3>
          <div className="space-y-md">
            {downloads.map((item) => {
              const classes = colorClasses[item.color];
              return (
                <div key={item.name} className="flex items-center justify-between p-md bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors border border-transparent hover:border-outline-variant">
                  <div className="flex items-center gap-md">
                    <div className={`w-10 h-10 ${classes.bg} ${classes.text} rounded flex items-center justify-center`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-surface">{item.name}</p>
                      <span className="font-label-caps text-[10px] text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded">{item.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (item.content) {
                         const blob = new Blob([item.content], { type: 'text/plain' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `${item.name.toLowerCase().replace(/\s+/g, '_')}.txt`;
                         document.body.appendChild(a);
                         a.click();
                         document.body.removeChild(a);
                         URL.revokeObjectURL(url);
                      }
                    }}
                    className={`material-symbols-outlined ${classes.text} ${classes.hover} p-2 rounded-full transition-colors`}
                  >
                    download
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-xl flex flex-col gap-md">
            <button className="w-full bg-primary text-on-primary py-md rounded-lg font-headline-sm shadow-md hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-sm">
              <span className="material-symbols-outlined">cloud_download</span>
              Download All
            </button>
            <button
              onClick={resetApp}
              className="w-full bg-transparent border-2 border-primary text-primary py-md rounded-lg font-headline-sm hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              Create Another Story
            </button>
          </div>
        </div>

        {/* Ad/Tip Card */}
        <div className="relative rounded-xl overflow-hidden aspect-square shadow-lg group">
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU75OvzoMeITPPlIHKboqSU_c3hozu0J_vIlEkahCWH8aUb0lm2a8rMN-Bt8FNU_M5Edw9nLDQwxIJT0Y1bQ8yneB4bSLwiaY-FTBr0ABrV3kfbAKl7jIwGrhUfVxLXXxqSHJEv6-jEOhGDMWcwibvbIiwCJpRt1tc4CHu_ACUZq36_PrLL4CgyJoAAy_8bYSc8K-H_A6iee9xTxor2-Jl8KOOJLf6hu6mzzEkHZeBsRnOFbKYcQZ2JymWbzkYvZjSMrpNWFoffYS3"
            alt="Workspace with headphones"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-lg text-white">
            <p className="font-label-caps mb-xs">PRO TIP</p>
            <p className="font-headline-sm mb-md">Unlock full offline access with Premium</p>
            <button className="bg-white text-on-surface py-sm px-md rounded-full font-label-caps w-fit hover:bg-secondary-container transition-colors">Upgrade Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3Results;
