import { ReconData, Operative, DailyLog, FuelLog } from '@/types';

const STORAGE_KEY = 'operation_recon_data';

const getDefaultData = (): ReconData => ({
  operative: null,
  dailyLogs: [],
  weightHistory: [],
});

export const loadData = (): ReconData => {
  if (typeof window === 'undefined') return getDefaultData();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultData();
    return JSON.parse(stored);
  } catch {
    return getDefaultData();
  }
};

export const saveData = (data: ReconData): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const saveOperative = (operative: Operative): void => {
  const data = loadData();
  data.operative = operative;
  saveData(data);
};

export const getTodayLog = (): DailyLog | null => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  return data.dailyLogs.find(log => log.date === today) || null;
};

export const addFuelLog = (fuelLog: Omit<FuelLog, 'id' | 'timestamp'>): FuelLog => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];

  let todayLog = data.dailyLogs.find(log => log.date === today);

  if (!todayLog) {
    todayLog = {
      date: today,
      fuelLogs: [],
      totalCalories: 0,
      totalMacros: { protein: 0, carbs: 0, fat: 0 },
    };
    data.dailyLogs.push(todayLog);
  }

  const newLog: FuelLog = {
    ...fuelLog,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  todayLog.fuelLogs.push(newLog);
  todayLog.totalCalories = todayLog.fuelLogs.reduce((sum, log) => sum + log.calories, 0);
  todayLog.totalMacros = todayLog.fuelLogs.reduce(
    (acc, log) => ({
      protein: acc.protein + (log.macros?.protein || 0),
      carbs: acc.carbs + (log.macros?.carbs || 0),
      fat: acc.fat + (log.macros?.fat || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );

  saveData(data);
  return newLog;
};

export const logWeight = (weight: number): void => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];

  // Update weight history
  const existingIndex = data.weightHistory.findIndex(w => w.date === today);
  if (existingIndex >= 0) {
    data.weightHistory[existingIndex].weight = weight;
  } else {
    data.weightHistory.push({ date: today, weight });
  }

  // Update today's log
  let todayLog = data.dailyLogs.find(log => log.date === today);
  if (!todayLog) {
    todayLog = {
      date: today,
      fuelLogs: [],
      totalCalories: 0,
      totalMacros: { protein: 0, carbs: 0, fat: 0 },
    };
    data.dailyLogs.push(todayLog);
  }
  todayLog.weight = weight;

  // Update operative current mass
  if (data.operative) {
    data.operative.currentMass = weight;
  }

  saveData(data);
};

export const getRecentFoods = (limit: number = 20): FuelLog[] => {
  const data = loadData();
  const allLogs: FuelLog[] = [];

  // Collect all fuel logs from all days
  data.dailyLogs.forEach(day => {
    allLogs.push(...day.fuelLogs);
  });

  // Sort by timestamp descending and get unique by description
  const seen = new Set<string>();
  return allLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter(log => {
      if (seen.has(log.description)) return false;
      seen.add(log.description);
      return true;
    })
    .slice(0, limit);
};

export const resetAllData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
