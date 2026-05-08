import { useState } from 'react';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import ProgressIndicator from './components/ProgressIndicator';
import Step1Setup from './components/Step1Setup';
import Step2Builder from './components/Step2Builder';
import Step3Results from './components/Step3Results';
import Library from './components/Library';
import LibraryDetail from './components/LibraryDetail';
import GlobalFlashcardLibrary from './components/GlobalFlashcardLibrary';
import MyVocabulary from './components/MyVocabulary';

function App() {
  const [activeView, setActiveTab] = useState('wizard'); // 'wizard', 'library', 'flashcards', or 'vocabulary'
  const [selectedLibraryStoryId, setSelectedLibraryStoryId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [storyData, setStoryData] = useState(null);
  const [formData, setFormData] = useState({
    baseLanguage: 'English',
    targetLanguage: 'Spanish',
    level: 'A1',
    chapterCount: 1,
    sentenceLevelStyle: 'a1',
    sentencesPerChapter: 15,
    planningMode: 'single',
    storyIdea: '',
    vocabulary: '',
  });

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const resetApp = () => {
    setCurrentStep(1);
    setStoryData(null);
    setError(null);
    setFormData({
      baseLanguage: 'English',
      targetLanguage: 'Spanish',
      level: 'A1',
      chapterCount: 1,
      sentenceLevelStyle: 'a1',
      sentencesPerChapter: 15,
      planningMode: 'single',
      storyIdea: '',
      vocabulary: '',
    });
  };

  const handleGenerateStory = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const data = await response.json();
      setStoryData(data);
      nextStep();
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong while generating your story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const goToLibrary = () => {
    setActiveTab('library');
    setSelectedLibraryStoryId(null);
  };

  const goToCreate = () => {
    setActiveTab('wizard');
  };

  const handleUseVocabularyInStory = (selectedWords) => {
    const vocabString = selectedWords.map(w => w.targetWord).join(', ');
    setFormData(prev => ({
      ...prev,
      targetLanguage: 'French',
      level: 'B1',
      sentenceLevelStyle: 'b1',
      vocabulary: vocabString
    }));
    setActiveTab('wizard');
    setCurrentStep(2);
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md text-on-background bg-background">
      <TopAppBar onNavigate={setActiveTab} activeView={activeView} />

      <main className="flex-grow flex flex-col items-center py-xl px-margin max-w-7xl mx-auto w-full">
        {activeView === 'library' && !selectedLibraryStoryId && (
          <Library onViewDetails={setSelectedLibraryStoryId} />
        )}

        {activeView === 'library' && selectedLibraryStoryId && (
          <LibraryDetail storyId={selectedLibraryStoryId} onBack={() => setSelectedLibraryStoryId(null)} />
        )}

        {activeView === 'flashcards' && (
          <GlobalFlashcardLibrary />
        )}

        {activeView === 'vocabulary' && (
          <MyVocabulary onUseSelectedWords={handleUseVocabularyInStory} />
        )}

        {activeView === 'wizard' && currentStep === 1 && (
          <div className="max-w-4xl w-full grid md:grid-cols-12 gap-xl items-start my-auto">
            {/* Left Side: Visual/Context */}
            <div className="md:col-span-5 hidden md:block space-y-lg">
              <div className="rounded-xl overflow-hidden shadow-lg aspect-[4/5] relative">
                <img
                  className="object-cover w-full h-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUOiiAzxfXbI6eg_NlEO9Q9Qob2z9H60MkZQQ9aRSi1f_U7T2b9Lw8cdDLxkpe5MKLUgf24pD62zXbyFSN5NldsHiHVHYxTg4eZHM_EErnstWjsJUbp1511KnJpvHt0iA9BrQVVyyipfTlyMPYqBJbmj43zVYUwvcVkHh13EUZGtevnKsSKCTIBsO2BqzBsZ99-k3Wf7YHQxByMlS2ThgQMsF9EkK7f5NSc0djJECwAunH1nqSBET5KkUHryYJwHP-NgtpJQtbpJSD"
                  alt="Language Learning Illustration"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
              </div>
              <div className="p-lg bg-surface-container-low rounded-xl border border-outline-variant">
                <h3 className="font-headline-sm text-primary mb-2">Bilingual Immersion</h3>
                <p className="text-body-sm text-on-surface-variant">Our unique storytelling engine helps you bridge the gap between comprehension and fluency by blending your native language with your target language in real-time stories.</p>
              </div>
            </div>

            {/* Right Side: Step 1 Content */}
            <div className="md:col-span-7 w-full">
              <ProgressIndicator currentStep={currentStep} />
              <Step1Setup formData={formData} updateFormData={updateFormData} nextStep={nextStep} />
            </div>
          </div>
        )}

        {activeView === 'wizard' && currentStep === 2 && (
          <div className="max-w-5xl w-full">
            <div className="mb-xl text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-caps text-label-caps">Step 2 of 3</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-6 rounded-full bg-primary"></div>
                  <div className="h-1.5 w-6 rounded-full bg-primary"></div>
                  <div className="h-1.5 w-6 rounded-full bg-outline-variant"></div>
                </div>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Describe Your Story</h1>
              <p className="text-on-surface-variant font-body-md mt-2">Help the AI craft the perfect learning journey for your level.</p>
            </div>

            {error && (
              <div className="mb-lg p-lg bg-error-container text-on-error-container rounded-xl border border-error/20 flex items-center gap-md">
                <span className="material-symbols-outlined text-error">error</span>
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
              <Step2Builder
                formData={formData}
                updateFormData={updateFormData}
                nextStep={handleGenerateStory}
                prevStep={prevStep}
                isGenerating={isGenerating}
              />
              <aside className="lg:col-span-4 space-y-lg">
                <div className="bg-secondary-fixed/20 border border-secondary-container rounded-xl p-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-secondary-container">Pro Tip</h3>
                  </div>
                  <p className="text-body-sm text-on-secondary-fixed-variant leading-relaxed">
                    The more specific you are about your story idea, the better our AI can integrate your target vocabulary naturally into the plot. Try focusing on a hobby or a situation you face in daily life!
                  </p>
                </div>
                <div className="relative rounded-xl overflow-hidden shadow-xl aspect-video lg:aspect-square">
                  <img
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFFmfcinL9BMH-hc6zl5ADKx5zmI0H3-4Q2S7bjqT5XeopJEKXXYnWYvlaeSPRGfQvZZ-GJRRbBuEVY0PDpexGYc71kZTjkunYmaCq2oSw8jApkskMVMBpgzRYzZpCMUfHsF8ydNAU687DBCzH6G_DQoTDYlaZmTmvx9vZcUQzidXA7rAPltqvyFyXkyXXdLy1Rt3QGAfE56EL1SyiELvqE8B7VzLTvCjrGQLCdbLvpVvwb_R8DfUB-aqxSMd2hxzzrMe3LTkVbn-X"
                    alt="Workspace illustration"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent flex items-end p-lg">
                    <p className="text-on-primary font-body-sm italic">"Learning should feel like a story unfolding, not a list of tasks."</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activeView === 'wizard' && currentStep === 3 && (
          <div className="w-full">
            <div className="mb-xl max-w-3xl">
              <div className="flex justify-between items-end mb-sm">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface">Your Story Package</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Successfully generated your custom learning experience.</p>
                </div>
                <span className="font-label-caps text-label-caps text-secondary font-bold">Step 3 of 3 (Completed)</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container w-full"></div>
              </div>
            </div>

            {/* Success Message */}
            <div className="mb-xl space-y-md">
              <div className="bg-secondary-container/20 p-lg rounded-xl flex items-center gap-md border border-secondary-container/40">
                <div className="bg-secondary text-on-secondary p-sm rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <p className="font-headline-sm text-headline-sm text-on-secondary-fixed-variant">Your stories are ready!</p>
              </div>

              {storyData?.allPassed === false && (
                <div className="bg-error-container/20 p-md rounded-xl flex items-center gap-md border border-error/20 animate-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-error">warning</span>
                  <p className="text-body-sm text-on-error-container font-semibold">
                    Note: This story may not fully match all the selected length settings.
                  </p>
                </div>
              )}
            </div>

            <Step3Results formData={formData} storyData={storyData} resetApp={resetApp} />
          </div>
        )}
      </main>

      <BottomNavBar onNavigate={setActiveTab} activeView={activeView} />
    </div>
  );
}

export default App;
