
const Step3Results = ({ formData, resetApp }) => {
  const downloads = [
    { name: 'Story Script', type: 'PDF • 1.2 MB', icon: 'menu_book', color: 'primary' },
    { name: 'Interlinear Script', type: 'PDF • 1.5 MB', icon: 'translate', color: 'primary' },
    { name: 'Shadow Script', type: 'PDF • 1.1 MB', icon: 'record_voice_over', color: 'primary' },
    { name: 'SSML Script', type: 'XML • 200 KB', icon: 'code', color: 'secondary' },
    { name: 'Audio Pack (MP3)', type: 'MP3 • 45 MB', icon: 'headphones', color: 'secondary' },
    { name: 'Vocab Flashcards', type: 'CSV • 200 KB', icon: 'quiz', color: 'tertiary' },
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

        {/* Description Card */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
          <h3 className="font-headline-sm text-headline-sm mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">description</span>
            Story Description
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {formData.storyIdea || "A custom generated story based on your preferences."}
          </p>
        </div>

        {/* Audio Player Preview */}
        <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[80px]">music_note</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm mb-lg">Audio Preview</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-lg">
              <button className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-primary-container active:scale-90 transition-all shadow-lg">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </button>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-xs">
                  <span className="font-body-sm text-body-sm text-on-surface">Chapter 1: The Arrival</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">0:00 / 4:12</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-1/4"></div>
                </div>
              </div>
            </div>

            {/* HTML5 Audio Player with mock URL */}
            <audio controls className="w-full mt-2">
              <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            {/* TODO: Amazon Polly integration will provide the real audio URL here later */}
          </div>

          <div className="mt-lg flex justify-between">
            <button className="flex items-center gap-xs font-label-caps text-label-caps text-primary hover:underline">
              <span className="material-symbols-outlined text-sm">repeat</span>
              Loop Segment
            </button>
            <div className="flex gap-md">
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">fast_rewind</button>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary">fast_forward</button>
            </div>
          </div>
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
                  <button className={`material-symbols-outlined ${classes.text} ${classes.hover} p-2 rounded-full transition-colors`}>download</button>
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
