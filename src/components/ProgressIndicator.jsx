
const ProgressIndicator = ({ currentStep, totalSteps = 3 }) => {
  return (
    <div className="flex items-center justify-between mb-xl">
      <span className="text-label-caps font-label-caps text-on-surface-variant">Step {currentStep} of {totalSteps}</span>
      <div className="flex space-x-1">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`w-8 h-1.5 rounded-full ${
              i < currentStep ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
