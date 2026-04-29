
const Step2Builder = ({ formData, updateFormData, nextStep, prevStep, isGenerating }) => {
  const lengths = [
    { id: 'single', icon: 'description', label: 'Single story', sub: '~ 2 minutes' },
    { id: 'multi', icon: 'auto_stories', label: 'Multi-chapter', sub: '~ 2 mins/chapter' },
    { id: 'hero', icon: 'history_edu', label: "Hero's Journey", sub: '12 Chapters' },
  ];

  return (
    <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_20px_-4px_rgba(37,99,235,0.06)] p-lg md:p-xl">
      <form className="space-y-lg">
        {/* Story Length Selector */}
        <div>
          <label className="block font-headline-sm text-headline-sm text-on-surface mb-4">How long should the story be?</label>
          <div className="grid grid-cols-3 gap-4">
            {lengths.map((len) => {
              const isActive = formData.storyLength === len.id;
              return (
                <button
                  key={len.id}
                  type="button"
                  onClick={() => updateFormData({ storyLength: len.id })}
                  disabled={isGenerating}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all text-center ${
                    isActive
                      ? 'border-primary bg-primary-fixed/30'
                      : 'border-outline-variant hover:border-primary-container'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`material-symbols-outlined mb-2 ${isActive ? 'text-primary' : 'text-outline'}`}>
                    {len.icon}
                  </span>
                  <span className={`font-label-caps text-label-caps ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                    {len.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant mt-1">{len.sub}</span>
                </button>
              );
            })}
          </div>
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
