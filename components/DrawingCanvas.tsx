import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen, RefreshCcw, Check, Trash2, Palette, Settings2 } from 'lucide-react';
import { Language, UserPreferences } from '../types';
import { TRANSLATIONS } from '../translations';

interface DrawingCanvasProps {
  onConfirm: (imageData: string, prefs: UserPreferences) => void;
  lang: Language;
}

const PRESET_COLORS = [
  '#ffffff', // White
  '#a8a29e', // Stone
  '#000000', // Black
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#78350f', // Brown
];

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onConfirm, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#22c55e'); 
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  
  // New Preferences State
  const [dietPref, setDietPref] = useState<'AUTO' | 'HERBIVORE' | 'CARNIVORE' | 'OMNIVORE'>('AUTO');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill transparent initially
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a faint guide circle
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color; // Eraser uses destination-out
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    
    // Draw a single dot
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.closePath();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw guide
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    // Create a temporary canvas to export only the drawing, not the guide
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 256;
    tempCanvas.height = 256;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw the source canvas onto the smaller temp canvas (scaling down)
    tempCtx.drawImage(canvasRef.current, 0, 0, 256, 256);
    
    const dataUrl = tempCanvas.toDataURL('image/png');
    onConfirm(dataUrl, { diet: dietPref });
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="bg-stone-800 p-1 rounded-xl shadow-2xl border border-stone-700">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="bg-stone-900 rounded-lg cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 w-full bg-stone-800 p-4 rounded-xl border border-stone-700">
        
        {/* Colors Grid */}
        <div className="flex flex-wrap gap-2 justify-center pb-2">
             {PRESET_COLORS.map(c => (
                 <button
                    key={c}
                    onClick={() => { setColor(c); setTool('pen'); }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === 'pen' ? 'border-white scale-110' : 'border-stone-600'}`}
                    style={{ backgroundColor: c }}
                 />
             ))}
             
             {/* Custom Color Picker */}
             <label className="relative cursor-pointer group">
                <input 
                    type="color" 
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                    value={color}
                />
                <div className={`w-8 h-8 rounded-full border-2 border-stone-600 transition-transform group-hover:scale-110 flex items-center justify-center bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-green-500 to-blue-500 ${tool === 'pen' && !PRESET_COLORS.includes(color) ? 'border-white scale-110' : ''}`}>
                   <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                </div>
             </label>
        </div>

        <div className="h-px bg-stone-700 w-full" />

        <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2">
                <button
                    onClick={() => setTool('pen')}
                    className={`p-3 rounded-lg transition-colors ${tool === 'pen' ? 'bg-emerald-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}
                >
                    <Pen size={20} />
                </button>
                <button
                    onClick={() => setTool('eraser')}
                    className={`p-3 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-emerald-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}
                >
                    <Eraser size={20} />
                </button>
                <button
                    onClick={clearCanvas}
                    className="p-3 rounded-lg bg-stone-700 text-red-400 hover:bg-red-900/50 transition-colors"
                    title={t.clear}
                >
                    <Trash2 size={20} />
                </button>
            </div>
            
            <div className="flex items-center gap-4 text-stone-400 flex-1 min-w-[150px]">
                <span className="text-sm whitespace-nowrap">{t.canvasSize}</span>
                <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
            </div>
        </div>

        <div className="h-px bg-stone-700 w-full" />
        
        {/* Settings Section */}
        <div className="bg-stone-900/50 p-3 rounded-lg border border-stone-700/50">
           <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs font-bold uppercase tracking-wider">
              <Settings2 size={14} />
              {t.bioSettings}
           </div>
           <div className="flex items-center gap-4">
              <label className="text-stone-300 text-sm whitespace-nowrap">{t.dietSelector}</label>
              <select 
                  value={dietPref}
                  onChange={(e) => setDietPref(e.target.value as any)}
                  className="bg-stone-800 text-emerald-400 text-sm border border-stone-600 rounded px-2 py-1 focus:outline-none focus:border-emerald-500 w-full"
              >
                  <option value="AUTO">{t.dietAuto}</option>
                  <option value="HERBIVORE">{t.dietHerbivore}</option>
                  <option value="CARNIVORE">{t.dietCarnivore}</option>
                  <option value="OMNIVORE">{t.dietOmnivore}</option>
              </select>
           </div>
           {dietPref === 'AUTO' && (
               <p className="text-stone-500 text-xs mt-2 italic">{t.dietAutoHint}</p>
           )}
        </div>

        <button
            onClick={handleConfirm}
            className="w-full py-3 mt-2 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold rounded-lg shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95"
        >
            <Check size={20} />
            {t.done}
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;