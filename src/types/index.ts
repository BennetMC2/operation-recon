export type Gender = 'male' | 'female';
export type Intensity = 'standard' | 'special-ops';

export interface Operative {
  callsign: string;
  currentMass: number; // kg
  height: number; // cm
  age: number;
  gender: Gender;
  intensity: Intensity;
  bmr: number;
  tdee: number;
  dailyAmmo: number; // daily calorie goal
  targetMass?: number; // goal weight
  inductionComplete: boolean;
  createdAt: string;
}

export interface Macros {
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface FuelLog {
  id: string;
  timestamp: string;
  calories: number;
  description: string;
  macros: Macros;
  servingSize?: string;
  barcode?: string;
  photoUrl?: string;
  source: 'manual' | 'photo' | 'barcode' | 'search' | 'recent';
}

export interface DailyLog {
  date: string;
  fuelLogs: FuelLog[];
  totalCalories: number;
  totalMacros: Macros;
  weight?: number;
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  macros: Macros;
  servingSize: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface BarcodeProduct {
  name: string;
  brand?: string;
  calories: number;
  macros: Macros;
  servingSize: string;
  barcode: string;
}

export interface ReconData {
  operative: Operative | null;
  dailyLogs: DailyLog[];
  weightHistory: { date: string; weight: number }[];
}

export interface IntelBriefing {
  id: string;
  title: string;
  codename: string;
  message: string;
}

export const INTEL_BRIEFINGS: IntelBriefing[] = [
  {
    id: '1',
    title: 'DAY 1',
    codename: 'THERMOPYLAE',
    message: 'Fight in the shade. Cravings are the enemy\'s arrows. Don\'t hide. Fight.',
  },
  {
    id: '2',
    title: 'DAY 2',
    codename: 'BASTOGNE',
    message: 'The enemy demands surrender. Your answer: "NUTS!" Hold the line.',
  },
  {
    id: '3',
    title: 'DAY 3',
    codename: 'ROMAN CENTURIONS',
    message: 'They marched 20 miles with 60lbs. You can handle a salad. No excuses.',
  },
  {
    id: '4',
    title: 'DAY 4',
    codename: 'OMAHA BEACH',
    message: 'Movement is life. Get off the beach. Hit your step goal.',
  },
  {
    id: '5',
    title: 'DAY 5',
    codename: 'BUSHIDO CODE',
    message: 'To know and not to do is the same as not to know. Execute.',
  },
  {
    id: '6',
    title: 'DAY 6',
    codename: 'STALINGRAD',
    message: 'Order 227: Not a step back. Do not retreat into the pantry.',
  },
  {
    id: '7',
    title: 'DAY 7',
    codename: 'SAS MOTTO',
    message: 'Who Dares Wins. You outlasted 90% of the world this week. Keep pushing.',
  },
];
