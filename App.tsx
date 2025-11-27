import React, { useState, useEffect } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import GameWorld from './components/GameWorld';
import { GameState, SimulationConfig, Language, UserPreferences } from './types';
import { analyzeInsectDrawing } from './services/geminiService';
import { Sparkles, Bug, BrainCircuit, Languages } from 'lucide-react';
import { TRANSLATIONS } from './translations';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig | null>(null);
  const [lang, setLang] = useState<Language>('ru');
  const [introStep, setIntroStep] = useState(0); // 0 = Credit 1, 1 = Credit 2

  const t = TRANSLATIONS[lang];
  // Always use Russian as base for intro keys to access the _sub properties if needed, 
  // or just use the current lang t object if we structured it correctly.
  // Ideally, we want to show specific text regardless of selected lang initially, or both.
  // The user asked for "In English at the bottom".
  const t_ru = TRANSLATIONS['ru']; 

  const [loadingText, setLoadingText] = useState(t.loadingAnalyze);

  // Intro Sequence Effect
  useEffect(() => {
    if (gameState === GameState.INTRO) {
      // Step 0: Show first credit
      const timer1 = setTimeout(() => {
         setIntroStep(1); // Switch to second credit
      }, 3000);

      // Step 1: Finish intro
      const timer2 = setTimeout(() => {
         setGameState(GameState.START);
      }, 6000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [gameState]);

  const handleStart = () => setGameState(GameState.DRAWING);

  const handleDrawingConfirm = async (imageData: string, prefs: UserPreferences) => {
    setGameState(GameState.ANALYZING);
    setIsLoading(true);

    try {
      // 1. Analyze with Gemini
      setLoadingText(t.loadingAnalyze);
      const stats = await analyzeInsectDrawing(imageData, lang, prefs);
      setLoadingText(t.loadingDna);

      // 2. Prepare Image for Canvas
      const img = new Image();
      img.src = imageData;
      await new Promise((resolve) => { img.onload = resolve; });

      setSimulationConfig({
        stats,
        spriteImage: img
      });

      setIsLoading(false);
      setGameState(GameState.SIMULATION);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      alert(t.error);
      setGameState(GameState.DRAWING);
    }
  };

  const handleReset = () => {
    setGameState(GameState.START);
    setSimulationConfig(null);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'ru' ? 'en' : 'ru');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col">
      
      {/* INTRO SCREEN */}
      {gameState === GameState.INTRO && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
           {introStep === 0 && (
             <div className="flex flex-col items-center animate-fade-in-out">
                 <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 text-center mb-2">
                   {t_ru.introCredit1}
                 </h1>
                 <p className="text-xl md:text-2xl text-stone-500 font-light tracking-widest">
                   {t_ru.introCredit1_sub}
                 </p>
             </div>
           )}
           {introStep === 1 && (
             <div className="flex flex-col items-center animate-fade-in-out">
                 <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-center mb-2">
                   {t_ru.introCredit2}
                 </h1>
                 <p className="text-xl md:text-2xl text-stone-500 font-light tracking-widest">
                   {t_ru.introCredit2_sub}
                 </p>
             </div>
           )}
        </div>
      )}

      {/* Header (Hidden during Intro) */}
      {gameState !== GameState.INTRO && (
      <header className="p-4 border-b border-stone-800 bg-stone-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-stone-900">
                    <Bug size={24} />
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {t.appTitle}
                </h1>
            </div>

            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 transition-colors text-sm font-medium text-stone-300"
            >
                <Languages size={16} />
                <span>{lang === 'ru' ? 'English' : 'Русский'}</span>
            </button>
        </div>
      </header>
      )}

      {/* Main Content */}
      {gameState !== GameState.INTRO && (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* START SCREEN */}
        {gameState === GameState.START && (
          <div className="text-center max-w-lg space-y-8 animate-fade-in">
            <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white">
                  {t.startTitle1} <br/>
                  <span className="text-emerald-500">{t.startTitle2}</span>
                </h2>
                <p className="text-stone-400 text-lg leading-relaxed">
                  {t.startDesc}
                </p>
            </div>

            <button 
              onClick={handleStart}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-emerald-600 font-lg rounded-full hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 focus:ring-offset-stone-900"
            >
              <span className="mr-2">{t.btnStart}</span>
              <Sparkles size={20} className="group-hover:rotate-12 transition-transform"/>
            </button>

            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-stone-800">
                <div className="text-center">
                    <div className="mx-auto bg-stone-800 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-emerald-400 font-bold">1</div>
                    <span className="text-sm text-stone-500">{t.step1}</span>
                </div>
                <div className="text-center">
                    <div className="mx-auto bg-stone-800 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-emerald-400 font-bold">2</div>
                    <span className="text-sm text-stone-500">{t.step2}</span>
                </div>
                <div className="text-center">
                    <div className="mx-auto bg-stone-800 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-emerald-400 font-bold">3</div>
                    <span className="text-sm text-stone-500">{t.step3}</span>
                </div>
            </div>
          </div>
        )}

        {/* DRAWING SCREEN */}
        {gameState === GameState.DRAWING && (
          <div className="w-full flex flex-col items-center">
             <div className="mb-4 text-center">
                 <h3 className="text-2xl font-bold text-white">{t.drawTitle}</h3>
                 <p className="text-stone-400 text-sm">{t.drawDesc}</p>
             </div>
             <DrawingCanvas onConfirm={handleDrawingConfirm} lang={lang} />
          </div>
        )}

        {/* LOADING / ANALYZING SCREEN */}
        {gameState === GameState.ANALYZING && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
            <BrainCircuit size={64} className="text-emerald-500 animate-spin-slow" />
            <h3 className="text-2xl font-bold text-white">{loadingText}</h3>
            <p className="text-stone-500">{t.loadingSub}</p>
          </div>
        )}

        {/* SIMULATION SCREEN */}
        {gameState === GameState.SIMULATION && simulationConfig && (
          <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start">
             
             {/* Left: Game World */}
             <div className="flex-1 w-full flex justify-center">
                <GameWorld config={simulationConfig} onReset={handleReset} lang={lang} />
             </div>

             {/* Right: Stats Panel */}
             <div className="w-full lg:w-80 bg-stone-800/50 p-6 rounded-2xl border border-stone-700 backdrop-blur-sm self-start lg:sticky lg:top-24">
                <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">{t.species}</h3>
                    <h2 className="text-2xl font-bold text-emerald-400 leading-tight">{simulationConfig.stats.name}</h2>
                    <p className="text-stone-400 text-sm mt-2 italic">"{simulationConfig.stats.description}"</p>
                </div>
                
                <div className="space-y-4">
                    <StatBar label={t.statSpeed} value={simulationConfig.stats.speed} color="bg-blue-500" />
                    <StatBar label={t.statSize} value={simulationConfig.stats.size} color="bg-purple-500" />
                    <StatBar label={t.statRepro} value={simulationConfig.stats.reproductionRate} color="bg-pink-500" />
                    <StatBar label={t.statLife} value={simulationConfig.stats.lifespan} color="bg-orange-500" />
                </div>

                <div className="mt-6 pt-6 border-t border-stone-700">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-400">{t.dietLabel}</span>
                        <span className={`px-2 py-1 rounded font-bold text-xs ${
                            simulationConfig.stats.diet === 'CARNIVORE' ? 'bg-red-900/50 text-red-400' :
                            simulationConfig.stats.diet === 'HERBIVORE' ? 'bg-green-900/50 text-green-400' :
                            'bg-yellow-900/50 text-yellow-400'
                        }`}>
                            {simulationConfig.stats.diet === 'CARNIVORE' ? t.dietCarnivore :
                             simulationConfig.stats.diet === 'HERBIVORE' ? t.dietHerbivore : t.dietOmnivore}
                        </span>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-stone-900 rounded-lg flex flex-col items-center">
                    <span className="text-xs text-stone-500 mb-2">{t.originalSample}</span>
                    <img 
                        src={simulationConfig.spriteImage.src} 
                        className="w-24 h-24 object-contain opacity-80" 
                        alt="Original Drawing" 
                    />
                </div>
             </div>
          </div>
        )}
      </main>
      )}

      {gameState !== GameState.INTRO && (
      <footer className="p-6 text-center text-stone-600 text-sm">
        {t.footer}
      </footer>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        
        @keyframes fadeInOut { 
            0% { opacity: 0; transform: scale(0.9); } 
            20% { opacity: 1; transform: scale(1); }
            80% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.1); }
        }
        .animate-fade-in-out { animation: fadeInOut 3s ease-in-out forwards; }
      `}</style>
    </div>
  );
};

const StatBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div>
        <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>{label}</span>
            <span>{value}/10</span>
        </div>
        <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color}`} 
                style={{ width: `${(value / 10) * 100}%` }}
            ></div>
        </div>
    </div>
);

export default App;