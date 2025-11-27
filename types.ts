
export enum GameState {
  INTRO = 'INTRO',
  START = 'START',
  DRAWING = 'DRAWING',
  ANALYZING = 'ANALYZING',
  SIMULATION = 'SIMULATION',
}

export type Language = 'ru' | 'en';

export interface InsectStats {
  name: string;
  description: string;
  diet: 'HERBIVORE' | 'CARNIVORE' | 'OMNIVORE';
  speed: number; // 1-10
  size: number; // 1-10
  reproductionRate: number; // 1-10
  lifespan: number; // 1-10
  colorHex: string;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
}

export interface InsectEntity extends Entity {
  type: 'INSECT';
  speciesId: string; // To identify teams/species
  stats: InsectStats; // Individual stats for this species
  sprite: HTMLImageElement; // Individual sprite
  vx: number;
  vy: number;
  energy: number;
  age: number;
  maxAge: number;
  generation: number;
  scale: number;
  rotation: number;
  targetId: string | null;
  isPlayer?: boolean;
}

export type FoodType = 'PLANT' | 'MEAT';

export interface FoodEntity extends Entity {
  type: 'FOOD';
  foodType: FoodType;
  value: number;
}

export interface SimulationConfig {
  stats: InsectStats;
  spriteImage: HTMLImageElement;
}

export interface UserPreferences {
  diet: 'AUTO' | 'HERBIVORE' | 'CARNIVORE' | 'OMNIVORE';
}
