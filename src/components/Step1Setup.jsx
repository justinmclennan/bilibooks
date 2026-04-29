
const Step1Setup = ({ formData, updateFormData, nextStep }) => {
  return (
    <div className="glass-card rounded-xl p-xl shadow-xl">
      <div className="mb-xl">
        <h1 className="font-headline-lg text-on-surface mb-sm text-headline-lg">Create Your Story</h1>
        <p className="font-body-md text-on-surface-variant">Generate custom bilingual stories and audio for language practice.</p>
      </div>

      <form className="space-y-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Base Language</label>
            <div className="relative group">
              <select
                value={formData.baseLanguage}
                onChange={(e) => updateFormData({ baseLanguage: e.target.value })}
                className="w-full bg-surface-container-lowest border-outline-variant rounded-lg py-3 px-4 appearance-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-md"
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-outline">expand_more</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Target Language</label>
            <div className="relative group">
              <select
                value={formData.targetLanguage}
                onChange={(e) => updateFormData({ targetLanguage: e.target.value })}
                className="w-full bg-surface-container-lowest border-outline-variant rounded-lg py-3 px-4 appearance-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-md"
              >
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Japanese</option>
                <option>English</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-outline">expand_more</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Proficiency Level</label>
            <span className="text-[10px] text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Recommended</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-md">
            {['Pre-A1', 'A1', 'A2', 'B1', 'B2'].map((level) => {
              const labels = { 'Pre-A1': 'Beginner', A1: 'Novice', A2: 'Basic', B1: 'Intermediate', B2: 'Advanced' };
              const isChecked = formData.level === level;
              return (
                <label key={level} className="cursor-pointer group">
                  <input
                    type="radio"
                    name="level"
                    value={level}
                    checked={isChecked}
                    onChange={(e) => updateFormData({ level: e.target.value })}
                    className="peer sr-only"
                  />
                  <div className={`text-center py-4 border-2 rounded-xl transition-all ${
                    isChecked
                      ? 'border-primary bg-primary-fixed'
                      : 'border-outline-variant group-hover:bg-surface-container-low'
                  }`}>
                    <span className={`block font-headline-sm ${isChecked ? 'text-primary' : 'text-on-surface'}`}>{level}</span>
                    <span className="text-[10px] text-on-surface-variant uppercase font-semibold">{labels[level]}</span>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex items-center space-x-2 text-on-surface-variant bg-surface-container p-3 rounded-lg">
            <span className="material-symbols-outlined text-md">info</span>
            <p className="text-body-sm italic">Level affects vocabulary and sentence complexity.</p>
          </div>
        </div>

        <div className="pt-lg">
          <button
            onClick={nextStep}
            className="w-full bg-primary text-on-primary font-headline-sm py-4 rounded-xl shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            type="button"
          >
            <span>Next</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Step1Setup;
