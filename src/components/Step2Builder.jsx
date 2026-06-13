
const Step2Builder = ({ formData, updateFormData, nextStep, prevStep, isGenerating }) => {
  const sentenceLevelStyles = [
    { id: 'pre-a1', label: 'Beginner', sub: '3–5 words' },
    { id: 'a1', label: 'Beginner+', sub: '5–8 words' },
    { id: 'a2', label: 'Intermediate', sub: '9–14 words' },
    { id: 'b1', label: 'Intermediate+', sub: '14–20 words' },
  ];

  const planningModes = [
    { id: 'single', label: 'Single Story', sub: 'Simple' },
    { id: 'multi', label: 'Vocab Book', sub: 'Multi-Chapter' },
  ];

  return (
    <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_-4px_rgba(37,99,235,0.06)] p-lg md:p-xl">
      <form className="space-y-xl">
        {/* Planning Mode */}
        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-4">Planning Mode</label>
          <div className="grid grid-cols-2 gap-4">
            {planningModes.map((mode) => {
              const isActive = formData.planningMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateFormData({ planningMode: mode.id })}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all text-center ${
                    isActive
                      ? 'border-primary bg-primary-fixed/30'
                      : 'border-outline-variant hover:border-primary-container'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`font-label-caps text-label-caps ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                    {mode.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1">{mode.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Chapter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-2">Number of Chapters</label>
            <select
              value={formData.chapterCount === 1 || formData.chapterCount === 2 || formData.chapterCount === 3 || formData.chapterCount === 4 || formData.chapterCount === 5 || formData.chapterCount === 10 ? formData.chapterCount : 'custom'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                   updateFormData({ chapterCount: 6 });
                } else {
                   updateFormData({ chapterCount: parseInt(val) });
                }
              }}
              disabled={isGenerating}
              className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-3 text-on-surface transition-colors disabled:opacity-50"
            >
              <option value={1}>1 Chapter</option>
              <option value={2}>2 Chapters</option>
              <option value={3}>3 Chapters</option>
              <option value={4}>4 Chapters</option>
              <option value={5}>5 Chapters</option>
              <option value={10}>10 Chapters</option>
              <option value="custom">Custom</option>
            </select>
            {(formData.chapterCount !== 1 && formData.chapterCount !== 2 && formData.chapterCount !== 3 && formData.chapterCount !== 4 && formData.chapterCount !== 5 && formData.chapterCount !== 10) && (
              <input
                type="number"
                min="1"
                max="20"
                value={formData.chapterCount}
                onChange={(e) => updateFormData({ chapterCount: parseInt(e.target.value) || 1 })}
                className="mt-2 w-full rounded-xl border-outline-variant bg-surface-container-low p-3"
                placeholder="Enter count..."
              />
            )}
          </div>

          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-1">Sentences Per Chapter</label>
            <p className="text-[11px] text-on-surface-variant mb-2">Controls the length of each target-language chapter by the number of sentences (10–30).</p>
            <select
              value={[10, 15, 20, 25, 30].includes(formData.sentencesPerChapter) ? formData.sentencesPerChapter : 'custom'}
              onChange={(e) => {
                 const val = e.target.value;
                 if (val === 'custom') {
                   updateFormData({ sentencesPerChapter: 12 });
                 } else {
                   updateFormData({ sentencesPerChapter: parseInt(val) });
                 }
              }}
              disabled={isGenerating}
              className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-3 text-on-surface transition-colors disabled:opacity-50"
            >
              <option value={10}>10 Sentences (Short)</option>
              <option value={15}>15 Sentences (Medium)</option>
              <option value={20}>20 Sentences (Long)</option>
              <option value={25}>25 Sentences (Extra Long)</option>
              <option value={30}>30 Sentences (Max)</option>
              <option value="custom">Custom</option>
            </select>
            {(![10, 15, 20, 25, 30].includes(formData.sentencesPerChapter)) && (
               <div className="mt-2 space-y-1">
                 <input
                   type="number"
                   min="10"
                   max="30"
                   value={formData.sentencesPerChapter}
                   onChange={(e) => {
                     let val = parseInt(e.target.value) || 10;
                     if (val < 10) val = 10;
                     if (val > 30) val = 30;
                     updateFormData({ sentencesPerChapter: val });
                   }}
                   className="w-full rounded-xl border-outline-variant bg-surface-container-low p-3"
                   placeholder="Enter sentence count (10-30)..."
                 />
                 <p className="text-[10px] text-on-surface-variant px-1">Choose between 10 and 30 sentences.</p>
               </div>
            )}
          </div>
        </div>

        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-1">Words Per Sentence</label>
          <p className="text-[11px] text-on-surface-variant mb-4">
            Beginner and Beginner+ use one sentence per line. Intermediate and Intermediate+ use longer connected sentences split into two lines for audio practice.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sentenceLevelStyles.map((style) => {
              const isActive = formData.sentenceLevelStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateFormData({ sentenceLevelStyle: style.id })}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all text-center ${
                    isActive
                      ? 'border-primary bg-primary-fixed/30'
                      : 'border-outline-variant hover:border-primary-container'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`font-label-caps text-xs ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                    {style.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1">{style.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-outline-variant" />

        {/* Vocabulary to Review */}
        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-2" htmlFor="vocabulary">Vocabulary Plan</label>
          <p className="text-body-sm text-on-surface-variant mb-3">Paste your list (words separated by commas, newlines, or semicolons).</p>
          <textarea
            id="vocabulary"
            value={formData.vocabulary}
            onChange={(e) => updateFormData({ vocabulary: e.target.value })}
            disabled={isGenerating}
            className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-4 text-on-surface placeholder:text-outline transition-colors disabled:opacity-50"
            placeholder="gare, train, aller&#10;manger; boire&#10;vouloir"
            rows="5"
          ></textarea>
        </div>

        {/* Story Idea */}
        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-2" htmlFor="story_idea">Story Idea</label>
          <p className="text-body-sm text-on-surface-variant mb-3">Describe the setting, characters, or a specific scenario.</p>
          <textarea
            id="story_idea"
            value={formData.storyIdea}
            onChange={(e) => updateFormData({ storyIdea: e.target.value })}
            disabled={isGenerating}
            className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-4 text-on-surface placeholder:text-outline transition-colors disabled:opacity-50"
            placeholder="Example: A cozy detective mystery set in a small Parisian bakery during a winter storm..."
            rows="4"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-outline-variant mt-8">
          <button
            onClick={prevStep}
            disabled={isGenerating}
            className="px-8 py-3 rounded-lg border-2 border-primary text-primary font-headline-sm hover:bg-primary-fixed/20 transition-all active:scale-95 disabled:opacity-50"
            type="button"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={isGenerating}
            className="px-10 py-3 rounded-lg bg-primary text-on-primary font-headline-sm shadow-lg shadow-primary/20 hover:bg-on-primary-fixed-variant transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            type="button"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                Planning & Generating...
              </>
            ) : (
              'Generate Story'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Step2Builder;
