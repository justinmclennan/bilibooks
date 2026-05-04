
const BottomNavBar = ({ onNavigate, activeView }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-8px_20px_-6px_rgba(37,99,235,0.12)] rounded-t-3xl">
      <div
        onClick={() => onNavigate('wizard')}
        className={`flex flex-col items-center justify-center ${activeView === 'wizard' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'} rounded-2xl px-5 py-2 active:scale-90 transition-all duration-200 ease-out cursor-pointer`}
      >
        <span className="material-symbols-outlined">menu_book</span>
        <span className="font-headline-sm text-[10px] font-semibold uppercase tracking-wider">Learn</span>
      </div>
      <div
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center justify-center ${activeView === 'library' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500'} rounded-2xl px-5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-90 transition-all duration-200 ease-out cursor-pointer`}
      >
        <span className="material-symbols-outlined">auto_stories</span>
        <span className="font-headline-sm text-[10px] font-semibold uppercase tracking-wider">Library</span>
      </div>
      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-90 transition-all duration-200 ease-out">
        <span className="material-symbols-outlined">bar_chart</span>
        <span className="font-headline-sm text-[10px] font-semibold uppercase tracking-wider">Stats</span>
      </div>
      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-90 transition-all duration-200 ease-out">
        <span className="material-symbols-outlined">settings</span>
        <span className="font-headline-sm text-[10px] font-semibold uppercase tracking-wider">Settings</span>
      </div>
    </nav>
  );
};

export default BottomNavBar;
