
const TopAppBar = ({ onNavigate, activeView }) => {
  return (
    <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(37,99,235,0.08)] sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div
          onClick={() => onNavigate('wizard')}
          className="text-xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-headline-md cursor-pointer"
        >
          LinguStory
        </div>
        <div className="hidden md:flex space-x-8 items-center">
          <button
            onClick={() => onNavigate('wizard')}
            className={`${activeView === 'wizard' ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'} font-headline-sm text-sm font-medium transition-colors duration-200`}
          >
            Learn
          </button>
          <button
            onClick={() => onNavigate('library')}
            className={`${activeView === 'library' ? 'text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'} font-headline-sm text-sm font-medium transition-colors duration-200`}
          >
            Library
          </button>
          <button className="text-slate-500 dark:text-slate-400 font-headline-sm text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
            Stats
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer active:scale-95 transition-transform">language</span>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer active:scale-95 transition-transform">account_circle</span>
        </div>
      </div>
    </nav>
  );
};

export default TopAppBar;
