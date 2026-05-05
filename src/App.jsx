import { useState } from 'react';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import ProgressIndicator from './components/ProgressIndicator';
import Step1Setup from './components/Step1Setup';
import Step2Builder from './components/Step2Builder';
import Step3Results from './components/Step3Results';
import Library from './components/Library';
import LibraryDetail from './components/LibraryDetail';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [activeView, setActiveView] = useState('wizard');
  const [selectedLibraryStoryId, setSelectedLibraryStoryId] = useState(null);
  const [libraryItemId, setLibraryItemId] = useState(null);
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
    wordsPerChapter: 150,
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
    setLibraryItemId(null);
    setError(null);
  };

  const handleGenerateStory = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to generate story');
      const story = await response.json();
      setStoryData(story);

      // Auto-save
      const saveRes = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyData: story, formData }),
      });
      const saveResult = await saveRes.json();
      if (saveResult.success) setLibraryItemId(saveResult.id);

      nextStep();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md text-on-background bg-background">
      <TopAppBar onNavigate={setActiveView} activeView={activeView} />

      <main className="flex-grow flex flex-col items-center py-xl px-margin max-w-7xl mx-auto w-full">
        {activeView === 'library' && !selectedLibraryStoryId && (
          <Library onViewDetails={setSelectedLibraryStoryId} />
        )}

        {activeView === 'library' && selectedLibraryStoryId && (
          <LibraryDetail storyId={selectedLibraryStoryId} onBack={() => setSelectedLibraryStoryId(null)} />
        )}

        {activeView === 'wizard' && currentStep === 1 && (
          <div className="max-w-4xl w-full grid md:grid-cols-12 gap-xl items-start my-auto">
            <div className="md:col-span-5 hidden md:block space-y-lg">
              <div className="rounded-xl overflow-hidden shadow-lg aspect-[4/5] relative">
                <img className="object-cover w-full h-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUOiiAzxfXbI6eg_NlEO9Q9Qob2z9H60MkZQQ9aRSi1f_U7T2b9Lw8cdDLxkpe5MKLUgf24pD62zXbyFSN5NldsHiHVHYxTg4eZHM_EErnstWjsJUbp1511KnJpvHt0iA9BrQVVyyipfTlyMPYqBJbmj43zVYUwvcVkHh13EUZGtevnKsSKCTIBsO2BqzBsZ99-k3Wf7YHQxByMlS2ThgQMsF9EkK7f5NSc0djJECwAunH1nqSBET5KkUHryYJwHP-NgtpJQtbpJSD" alt="Illustration" />
              </div>
            </div>
            <div className="md:col-span-7 w-full">
              <ProgressIndicator currentStep={currentStep} />
              <Step1Setup formData={formData} updateFormData={updateFormData} nextStep={nextStep} />
            </div>
          </div>
        )}

        {activeView === 'wizard' && currentStep === 2 && (
          <div className="max-w-5xl w-full">
            <h1 className="font-headline-lg text-on-surface mb-4">Describe Your Story</h1>
            {error && <div className="p-md bg-error-container text-on-error-container rounded-xl mb-4">{error}</div>}
            <Step2Builder formData={formData} updateFormData={updateFormData} nextStep={handleGenerateStory} prevStep={prevStep} isGenerating={isGenerating} />
          </div>
        )}

        {activeView === 'wizard' && currentStep === 3 && (
          <ErrorBoundary>
            <Step3Results formData={formData} storyData={storyData} resetApp={resetApp} libraryItemId={libraryItemId} />
          </ErrorBoundary>
        )}
      </main>

      <BottomNavBar onNavigate={setActiveView} activeView={activeView} />
    </div>
  );
}

export default App;
