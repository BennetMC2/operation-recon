'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReconData, Operative, FuelLog, DailyLog } from '@/types';
import { loadData, saveData, saveOperative, addFuelLog as addFuelLogStorage, logWeight as logWeightStorage, getTodayLog, getRecentFoods as getRecentFoodsStorage, resetAllData } from '@/lib/storage';
import { Macros } from '@/types';

interface ReconContextType {
  data: ReconData;
  operative: Operative | null;
  todayLog: DailyLog | null;
  isLoading: boolean;
  setOperative: (operative: Operative) => void;
  addFuelLog: (log: Omit<FuelLog, 'id' | 'timestamp'>) => void;
  logWeight: (weight: number) => void;
  getCaloriesRemaining: () => number;
  getTodayMacros: () => Macros;
  getRecentFoods: () => FuelLog[];
  resetAll: () => void;
  refreshData: () => void;
}

const ReconContext = createContext<ReconContextType | undefined>(undefined);

export function ReconProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ReconData>({ operative: null, dailyLogs: [], weightHistory: [] });
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = () => {
    const loaded = loadData();
    setData(loaded);
  };

  useEffect(() => {
    refreshData();
    setIsLoading(false);
  }, []);

  const setOperative = (operative: Operative) => {
    saveOperative(operative);
    refreshData();
  };

  const addFuelLog = (log: Omit<FuelLog, 'id' | 'timestamp'>) => {
    addFuelLogStorage(log);
    refreshData();
  };

  const logWeight = (weight: number) => {
    logWeightStorage(weight);
    refreshData();
  };

  const getCaloriesRemaining = (): number => {
    if (!data.operative) return 0;
    const today = getTodayLog();
    const consumed = today?.totalCalories || 0;
    return data.operative.dailyAmmo - consumed;
  };

  const getTodayMacros = (): Macros => {
    const today = getTodayLog();
    return today?.totalMacros || { protein: 0, carbs: 0, fat: 0 };
  };

  const getRecentFoods = (): FuelLog[] => {
    return getRecentFoodsStorage();
  };

  const resetAll = () => {
    resetAllData();
    setData({ operative: null, dailyLogs: [], weightHistory: [] });
  };

  const todayLog = data.dailyLogs.find(
    log => log.date === new Date().toISOString().split('T')[0]
  ) || null;

  return (
    <ReconContext.Provider
      value={{
        data,
        operative: data.operative,
        todayLog,
        isLoading,
        setOperative,
        addFuelLog,
        logWeight,
        getCaloriesRemaining,
        getTodayMacros,
        getRecentFoods,
        resetAll,
        refreshData,
      }}
    >
      {children}
    </ReconContext.Provider>
  );
}

export function useRecon() {
  const context = useContext(ReconContext);
  if (context === undefined) {
    throw new Error('useRecon must be used within a ReconProvider');
  }
  return context;
}
