
const Step2Builder = ({ formData, updateFormData, nextStep, prevStep, isGenerating }) => {
  const wordsPerLineOptions = [
    { id: 'short', label: 'Short', sub: '~5-8 words' },
    { id: 'medium', label: 'Medium', sub: '~10-15 words' },
    { id: 'long', label: 'Long', sub: '~18-25 words' },
  ];

  const sentenceFormats = [
    { id: 'single', label: 'Single', sub: 'Standard' },
    { id: 'split', label: 'Split', sub: 'Bilingual Half-Sentences' },
  ];

  return (
    <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_-4px_rgba(37,99,235,0.06)] p-lg md:p-xl">
      <form className="space-y-xl">
        {/* Multi-Chapter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-2">Chapters</label>
            <p className="text-body-sm text-on-surface-variant mb-4">How many chapters should the story have?</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={formData.chapterCount}
                onChange={(e) => updateFormData({ chapterCount: parseInt(e.target.value) })}
                disabled={isGenerating}
                className="flex-grow accent-primary"
              />
              <span className="w-12 h-12 flex items-center justify-center bg-primary-container text-on-primary-container rounded-lg font-headline-sm">
                {formData.chapterCount}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-2">Target Words / Chapter</label>
            <p className="text-body-sm text-on-surface-variant mb-4">Approximate word count per chapter.</p>
            <select
              value={formData.wordsPerChapter}
              onChange={(e) => updateFormData({ wordsPerChapter: parseInt(e.target.value) })}
              disabled={isGenerating}
              className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-3 text-on-surface transition-colors disabled:opacity-50"
            >
              <option value={50}>~50 words (Quick)</option>
              <option value={100}>~100 words (Standard)</option>
              <option value={200}>~200 words (Extended)</option>
              <option value={300}>~300 words (Long)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
           {/* Words Per Line */}
          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-4">Words Per Line</label>
            <div className="grid grid-cols-3 gap-2">
              {wordsPerLineOptions.map((opt) => {
                const isActive = formData.wordsPerLine === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateFormData({ wordsPerLine: opt.id })}
                    disabled={isGenerating}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all text-center ${
                      isActive
                        ? 'border-primary bg-primary-fixed/30'
                        : 'border-outline-variant hover:border-primary-container'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`font-label-caps text-xs ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant mt-1">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sentence Format */}
          <div>
            <label className="block font-headline-sm text-headline-sm text-on-surface mb-4">Sentence Format</label>
            <div className="grid grid-cols-2 gap-2">
              {sentenceFormats.map((fmt) => {
                const isActive = formData.sentenceFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => updateFormData({ sentenceFormat: fmt.id })}
                    disabled={isGenerating}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all text-center ${
                      isActive
                        ? 'border-primary bg-primary-fixed/30'
                        : 'border-outline-variant hover:border-primary-container'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`font-label-caps text-xs ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {fmt.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant mt-1">{fmt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <hr className="border-outline-variant" />

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

        {/* Vocabulary to Review */}
        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-2" htmlFor="vocabulary">Vocabulary to Review</label>
          <p className="text-body-sm text-on-surface-variant mb-3">Include specific words or grammar points you want to practice.</p>
          <textarea
            id="vocabulary"
            value={formData.vocabulary}
            onChange={(e) => updateFormData({ vocabulary: e.target.value })}
            disabled={isGenerating}
            className="w-full rounded-xl border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-low font-body-md p-4 text-on-surface placeholder:text-outline transition-colors disabled:opacity-50"
            placeholder="List words separated by commas (e.g., subjunctive mood, kitchen utensils, polite requests)..."
            rows="3"
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
                Generating...
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
