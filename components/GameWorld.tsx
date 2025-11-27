
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InsectEntity, FoodEntity, SimulationConfig, Language, FoodType, InsectStats, Entity } from '../types';
import { TRANSLATIONS } from '../translations';
import { 
    CANVAS_WIDTH, 
    CANVAS_HEIGHT, 
    INITIAL_INSECT_COUNT, 
    INITIAL_FOOD_COUNT, 
    SPAWN_RATE_PLANT,
    SPAWN_RATE_MEAT,
    MAX_ENTITIES,
    REPRODUCTION_ENERGY_THRESHOLD,
    FOOD_PLANT_VALUE,
    FOOD_MEAT_VALUE,
    BASE_ENERGY_COST
} from '../constants';
import { Play, Pause, FastForward, Plus, Gamepad2, User, Swords, Loader2 } from 'lucide-react';
import { generateRandomInsectImage } from '../utils/proceduralArt';
import { analyzeInsectDrawing } from '../services/geminiService';

interface GameWorldProps {
  config: SimulationConfig;
  onReset: () => void;
  lang: Language;
}

const GameWorld: React.FC<GameWorldProps> = ({ config, onReset, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Simulation State Refs (Mutable for performance in game loop)
  const insectsRef = useRef<InsectEntity[]>([]);
  const foodRef = useRef<FoodEntity[]>([]);
  const timeRef = useRef<number>(0);
  
  // Player Control Refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const playerInsectId = useRef<string | null>(null);
  
  // UI State
  const [isRunning, setIsRunning] = useState(true);
  const [isPlayingAsInsect, setIsPlayingAsInsect] = useState(false);
  const [stats, setStats] = useState({ population: 0, generation: 1, food: 0 });
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isGeneratingRival, setIsGeneratingRival] = useState(false);

  const t = TRANSLATIONS[lang];

  // --- Initialization ---
  const spawnInsect = useCallback((
      x: number, 
      y: number, 
      stats: InsectStats, 
      sprite: HTMLImageElement,
      generation: number, 
      speciesId: string,
      parentEnergy?: number, 
      isPlayer: boolean = false
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    // Stats affect attributes
    const speedBase = stats.speed / 2; // 0.5 to 5
    const sizeScale = 0.5 + (stats.size / 20); // 0.55 to 1.0
    const maxAge = stats.lifespan * 500; // Frames

    const newInsect: InsectEntity = {
      id,
      type: 'INSECT',
      speciesId,
      stats,   // Assign individual stats
      sprite,  // Assign individual sprite
      x,
      y,
      vx: (Math.random() - 0.5) * speedBase,
      vy: (Math.random() - 0.5) * speedBase,
      energy: isPlayer ? 250 : (parentEnergy ? 50 : 100), // Player starts with extra energy
      age: 0,
      maxAge: maxAge + (Math.random() * 200), // Variance
      generation,
      scale: sizeScale,
      rotation: 0,
      targetId: null,
      isPlayer: isPlayer
    };
    return newInsect;
  }, []);

  const spawnFood = (type: FoodType = 'PLANT', x?: number, y?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    return {
      id,
      type: 'FOOD',
      foodType: type,
      x: x ?? Math.random() * CANVAS_WIDTH,
      y: y ?? Math.random() * CANVAS_HEIGHT,
      value: type === 'MEAT' ? FOOD_MEAT_VALUE : FOOD_PLANT_VALUE
    } as FoodEntity;
  };

  useEffect(() => {
    // Initial Spawn of Player's Species
    const initialInsects = Array.from({ length: INITIAL_INSECT_COUNT }).map(() => 
      spawnInsect(
          Math.random() * CANVAS_WIDTH, 
          Math.random() * CANVAS_HEIGHT, 
          config.stats,
          config.spriteImage,
          1,
          'PLAYER_SPECIES'
      )
    );
    // Initial Food
    const initialFood = Array.from({ length: INITIAL_FOOD_COUNT }).map((_, i) => 
        spawnFood(i < 3 ? 'MEAT' : 'PLANT')
    );

    insectsRef.current = initialInsects;
    foodRef.current = initialFood;

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spawnInsect, config]);


  // --- Game Loop Logic ---
  const update = () => {
    if (!isRunning) return;

    // Apply speed multiplier
    for (let s = 0; s < speedMultiplier; s++) {
        performSimulationStep();
    }
  };

  const performSimulationStep = () => {
    timeRef.current++;
    const insects = insectsRef.current;
    let foods = foodRef.current;
    const newInsects: InsectEntity[] = [];

    // Spawn random food
    if (foods.length < MAX_ENTITIES) {
        if (Math.random() < SPAWN_RATE_PLANT) {
            foods.push(spawnFood('PLANT'));
        }
        if (Math.random() < SPAWN_RATE_MEAT) {
             foods.push(spawnFood('MEAT'));
        }
    }

    // Check if player is still alive
    if (isPlayingAsInsect && playerInsectId.current) {
        const playerExists = insects.some(i => i.id === playerInsectId.current);
        if (!playerExists) {
            playerInsectId.current = null;
        }
    }

    // Process Insects
    insects.forEach((insect, index) => {
        // 1. Age & Energy Decay
        insect.age++;
        // Player energy decays slower for fun
        const energyCost = (BASE_ENERGY_COST + (insect.stats.speed * 0.05) + (insect.stats.size * 0.05)) * (insect.isPlayer ? 0.5 : 1.0);
        insect.energy -= energyCost;

        // Death condition
        if (insect.energy <= 0 || insect.age >= insect.maxAge) {
            // Dies. Spawns Meat (corpse)
            foods.push(spawnFood('MEAT', insect.x, insect.y));
            return; // Filtered out
        }

        // PLAYER CONTROL LOGIC
        if (insect.isPlayer) {
            const speed = (insect.stats.speed * 0.5) + 2; // Slightly faster for responsiveness
            let inputVx = 0;
            let inputVy = 0;

            if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) inputVy -= 1;
            if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) inputVy += 1;
            if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) inputVx -= 1;
            if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) inputVx += 1;

            // Normalize vector
            if (inputVx !== 0 || inputVy !== 0) {
                const len = Math.sqrt(inputVx*inputVx + inputVy*inputVy);
                inputVx = (inputVx / len) * speed;
                inputVy = (inputVy / len) * speed;
                
                // Ease towards input (responsiveness vs weight)
                insect.vx = insect.vx * 0.8 + inputVx * 0.2;
                insect.vy = insect.vy * 0.8 + inputVy * 0.2;
                
                insect.rotation = Math.atan2(insect.vy, insect.vx);
            } else {
                // Friction
                insect.vx *= 0.9;
                insect.vy *= 0.9;
            }
        } else {
            // AI BEHAVIOR
            
            // 2. Find Food or Prey
            let targetEntity: Entity | null = null;
            let minDist = Infinity;
            const sensorRadius = 150 + (insect.stats.lifespan * 10); 

            // Search Food
            for (const f of foods) {
                if (insect.stats.diet === 'HERBIVORE' && f.foodType === 'MEAT') continue;
                if (insect.stats.diet === 'CARNIVORE' && f.foodType === 'PLANT') continue;
                
                const dx = f.x - insect.x;
                const dy = f.y - insect.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < sensorRadius && dist < minDist) {
                    minDist = dist;
                    targetEntity = f;
                }
            }

            // Search Prey (Other Insects)
            // Only if Carnivore or Omnivore
            if (insect.stats.diet !== 'HERBIVORE') {
                for (const prey of insects) {
                    if (prey.id === insect.id) continue;
                    // Dont eat same species usually
                    if (prey.speciesId === insect.speciesId) continue; 
                    
                    // Can only eat smaller insects
                    if (insect.stats.size > prey.stats.size) {
                        const dx = prey.x - insect.x;
                        const dy = prey.y - insect.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < sensorRadius && dist < minDist) {
                            minDist = dist;
                            targetEntity = prey;
                        }
                    }
                }
            }

            // 3. Movement
            const speed = (insect.stats.speed * 0.5) + 1;
            
            if (targetEntity) {
                const angle = Math.atan2(targetEntity.y - insect.y, targetEntity.x - insect.x);
                insect.vx = Math.cos(angle) * speed;
                insect.vy = Math.sin(angle) * speed;
                insect.rotation = angle;
            } else {
                // Wander
                if (timeRef.current % 20 === 0) {
                     const angle = Math.atan2(insect.vy, insect.vx) + (Math.random() - 0.5);
                     insect.vx = Math.cos(angle) * speed;
                     insect.vy = Math.sin(angle) * speed;
                     insect.rotation = angle;
                }
            }
        }

        // Apply Velocity
        insect.x += insect.vx;
        insect.y += insect.vy;

        // Boundaries
        if (insect.x < 0 || insect.x > CANVAS_WIDTH) { insect.vx *= -1; insect.x = Math.max(0, Math.min(CANVAS_WIDTH, insect.x)); }
        if (insect.y < 0 || insect.y > CANVAS_HEIGHT) { insect.vy *= -1; insect.y = Math.max(0, Math.min(CANVAS_HEIGHT, insect.y)); }

        // 4. Eat Food
        for (let i = 0; i < foods.length; i++) {
            const f = foods[i];
            const dx = insect.x - f.x;
            const dy = insect.y - f.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 20) {
                 const canEat = insect.stats.diet === 'OMNIVORE' || 
                               (insect.stats.diet === 'HERBIVORE' && f.foodType === 'PLANT') ||
                               (insect.stats.diet === 'CARNIVORE' && f.foodType === 'MEAT');
                 
                 if (canEat) {
                    insect.energy += f.value;
                    foods.splice(i, 1);
                    i--; 
                 }
            }
        }

        // 5. Reproduce
        // Threshold modified by reproduction rate
        const threshold = REPRODUCTION_ENERGY_THRESHOLD - (insect.stats.reproductionRate * 3);
        
        if (insect.energy > threshold && insects.length + newInsects.length < 50) {
            insect.energy -= 40; 
            newInsects.push(spawnInsect(
                insect.x, 
                insect.y, 
                insect.stats,
                insect.sprite,
                insect.generation + 1,
                insect.speciesId, 
                insect.energy, 
                false
            ));
        }

        newInsects.push(insect);
    });

    // 6. Predation (Insect vs Insect)
    // Run collision check on the surviving insects
    // Use a simple loop. If eaten, remove from newInsects.
    // We iterate backwards to safely remove.
    for (let i = newInsects.length - 1; i >= 0; i--) {
        const predator = newInsects[i];
        if (predator.energy <= 0) continue; // Already dead or removed
        
        // Skip if Herbivore
        if (predator.stats.diet === 'HERBIVORE') continue;

        for (let j = newInsects.length - 1; j >= 0; j--) {
            if (i === j) continue;
            const prey = newInsects[j];
            
            // Cannot eat own species
            if (predator.speciesId === prey.speciesId) continue;

            const dx = predator.x - prey.x;
            const dy = predator.y - prey.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Collision radius approx based on size
            const collisionDist = (predator.scale * 16) + (prey.scale * 16);

            if (dist < collisionDist * 0.8) {
                // Check Size Advantage
                if (predator.stats.size > prey.stats.size) {
                    // EAT!
                    predator.energy += 60; // Big boost for hunting
                    // Prey dies instantly
                    newInsects.splice(j, 1);
                    // Adjust index if necessary
                    if (j < i) i--;
                }
            }
        }
    }

    insectsRef.current = newInsects;
    foodRef.current = foods;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1c1917'; // bg-stone-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y <= canvas.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Draw Food
    foodRef.current.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.foodType === 'MEAT' ? 6 : 4, 0, Math.PI * 2);
        
        if (f.foodType === 'MEAT') {
            ctx.fillStyle = '#ef4444'; 
            ctx.shadowColor = '#ef4444';
        } else {
            ctx.fillStyle = '#84cc16'; 
            ctx.shadowColor = '#84cc16';
        }
        ctx.fill();
        ctx.shadowBlur = 5;
    });
    ctx.shadowBlur = 0;

    // Draw Insects
    insectsRef.current.forEach(insect => {
        ctx.save();
        ctx.translate(insect.x, insect.y);
        ctx.rotate(insect.rotation + Math.PI / 2);
        
        const size = 32 * insect.scale;
        
        // Player Indicator
        if (insect.isPlayer) {
            ctx.beginPath();
            ctx.arc(0, 0, size/2 + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24'; // Amber
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw the specific sprite for this insect
        try {
            ctx.drawImage(insect.sprite, -size/2, -size/2, size, size);
        } catch (e) {
            // Fallback just in case
        }
        ctx.restore();

        // Name Tags
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        
        if (insect.isPlayer) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText("YOU", insect.x, insect.y - size);
        } else if (insect.stats.name) {
             // Optional: Show name for big bugs?
             // ctx.fillStyle = '#666';
             // ctx.fillText(insect.stats.name.substring(0, 5), insect.x, insect.y - size);
        }
    });
  };

  const animate = useCallback(() => {
    update();
    draw();
    
    // Update stats UI
    if (timeRef.current % 10 === 0) {
        let maxGen = 1;
        insectsRef.current.forEach(i => { if (i.generation > maxGen) maxGen = i.generation; });
        setStats({
            population: insectsRef.current.length,
            food: foodRef.current.length,
            generation: maxGen
        });
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isRunning, speedMultiplier, isPlayingAsInsect]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const addMoreFood = () => {
    const newFood = Array.from({ length: 10 }).map(() => spawnFood('PLANT'));
    const newMeat = Array.from({ length: 2 }).map(() => spawnFood('MEAT'));
    foodRef.current = [...foodRef.current, ...newFood, ...newMeat];
  };

  const spawnRival = async () => {
      setIsGeneratingRival(true);
      try {
          // 1. Procedural Draw
          const rivalImageBase64 = generateRandomInsectImage();
          
          // 2. Analyze with Gemini
          const rivalStats = await analyzeInsectDrawing(rivalImageBase64, lang, { diet: 'AUTO' });
          
          // 3. Create Sprite
          const img = new Image();
          img.src = rivalImageBase64;
          await new Promise((resolve) => { img.onload = resolve; });

          // 4. Spawn 3 rivals
          const speciesId = `RIVAL_${Math.random().toString(36).substr(2, 5)}`;
          const rivals = Array.from({ length: 3 }).map(() => 
              spawnInsect(
                  Math.random() * CANVAS_WIDTH,
                  Math.random() * CANVAS_HEIGHT,
                  rivalStats,
                  img,
                  1,
                  speciesId
              )
          );
          
          insectsRef.current = [...insectsRef.current, ...rivals];
      } catch (e) {
          console.error("Failed to spawn rival", e);
      } finally {
          setIsGeneratingRival(false);
      }
  };

  const togglePlayMode = () => {
      if (isPlayingAsInsect && playerInsectId.current) {
          setIsPlayingAsInsect(false);
          const player = insectsRef.current.find(i => i.id === playerInsectId.current);
          if (player) player.isPlayer = false;
          playerInsectId.current = null;
      } else {
          setIsPlayingAsInsect(true);
          const player = spawnInsect(
              CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 
              config.stats, config.spriteImage, 
              1, 'PLAYER_SPECIES', undefined, true
          );
          insectsRef.current.push(player);
          playerInsectId.current = player.id;
          setIsRunning(true);
      }
  };

  const isPlayerAlive = isPlayingAsInsect && insectsRef.current.some(i => i.id === playerInsectId.current);

  return (
    <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
      <div className="flex flex-wrap gap-4 w-full max-w-4xl justify-between items-end text-stone-300 mb-2">
         {/* Stats Display */}
         <div className="flex gap-6 text-sm md:text-base bg-stone-800 px-6 py-2 rounded-full border border-stone-700 shadow-lg">
             <div className="flex flex-col items-center">
                 <span className="text-stone-500 text-xs uppercase font-bold tracking-wider">{t.population}</span>
                 <span className="text-2xl font-mono text-emerald-400">{stats.population}</span>
             </div>
             <div className="w-px bg-stone-700"></div>
             <div className="flex flex-col items-center">
                 <span className="text-stone-500 text-xs uppercase font-bold tracking-wider">{t.food}</span>
                 <span className="text-2xl font-mono text-lime-400">{stats.food}</span>
             </div>
         </div>

         {/* Controls */}
         <div className="flex gap-2 flex-wrap justify-end">
            
            <button
                onClick={spawnRival}
                disabled={isGeneratingRival}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-lg ${isGeneratingRival ? 'bg-stone-700 opacity-50 cursor-wait' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
            >
                {isGeneratingRival ? <Loader2 size={20} className="animate-spin" /> : <Swords size={20} />}
                <span className="hidden md:inline">{isGeneratingRival ? t.generatingRival : t.addRival}</span>
            </button>

            <button 
                onClick={togglePlayMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-lg ${
                    isPlayingAsInsect 
                    ? 'bg-amber-600 text-white hover:bg-amber-500 ring-2 ring-amber-400' 
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
            >
                {isPlayingAsInsect ? <User size={20} /> : <Gamepad2 size={20} />}
                <span className="hidden md:inline">{isPlayingAsInsect ? (isPlayerAlive ? t.playingControl : t.respawn) : t.playAsInsect}</span>
            </button>
            
            <div className="w-px bg-stone-700 mx-1"></div>

            <button 
                onClick={() => setIsRunning(!isRunning)} 
                className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-white transition-colors"
                title={isRunning ? t.pause : "Play"}
            >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
                onClick={() => setSpeedMultiplier(s => s === 1 ? 4 : 1)} 
                className={`p-3 rounded-lg transition-colors ${speedMultiplier > 1 ? 'bg-emerald-600 text-white' : 'bg-stone-700 text-stone-300'}`}
                title="x4 Speed"
            >
                <FastForward size={20} />
            </button>
            <button 
                onClick={addMoreFood} 
                className="p-3 bg-lime-700 hover:bg-lime-600 rounded-lg text-white transition-colors"
                title={t.addFood}
            >
                <Plus size={20} />
            </button>
         </div>
      </div>

      {/* Game Canvas */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-stone-700 bg-stone-900 group">
        <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className="w-full max-w-[800px] h-auto block"
        />
        {!isRunning && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                <span className="text-white font-bold text-xl tracking-widest uppercase">{t.pauseOverlay}</span>
            </div>
        )}
        {isPlayingAsInsect && isPlayerAlive && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-amber-400 text-xs font-mono pointer-events-none">
                {t.playingControl}
            </div>
        )}
      </div>
      
      <div className="flex justify-between w-full max-w-4xl px-2 text-stone-500 text-sm mt-2">
          <span>{t.addFoodHint}</span>
          <div className="flex gap-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-500"></span>{t.plants}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{t.meat}</span>
          </div>
      </div>
       <button onClick={onReset} className="mt-4 text-stone-500 hover:text-stone-300 underline">
          {t.createNew}
      </button>
    </div>
  );
};

export default GameWorld;
