import { Gender, Intensity } from '@/types';

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 */
export const calculateBMR = (
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number => {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return gender === 'male' ? base + 5 : base - 161;
};

/**
 * Calculate Total Daily Energy Expenditure
 * Using sedentary multiplier (1.2)
 */
export const calculateTDEE = (bmr: number): number => {
  return Math.round(bmr * 1.2);
};

/**
 * Get calorie deficit based on intensity
 */
export const getDeficit = (intensity: Intensity): number => {
  return intensity === 'standard' ? 500 : 1000;
};

/**
 * Calculate daily calorie goal (Daily Ammo)
 */
export const calculateDailyAmmo = (tdee: number, intensity: Intensity): number => {
  return tdee - getDeficit(intensity);
};

/**
 * Calculate all metrics for an operative
 */
export const calculateMetrics = (
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  intensity: Intensity
): { bmr: number; tdee: number; dailyAmmo: number } => {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr);
  const dailyAmmo = calculateDailyAmmo(tdee, intensity);

  return { bmr: Math.round(bmr), tdee, dailyAmmo };
};

/**
 * Convert lbs to kg
 */
export const lbsToKg = (lbs: number): number => {
  return Math.round(lbs * 0.453592 * 10) / 10;
};

/**
 * Convert kg to lbs
 */
export const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462 * 10) / 10;
};

/**
 * Convert feet/inches to cm
 */
export const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round((feet * 30.48) + (inches * 2.54));
};

/**
 * Convert cm to feet and inches
 */
export const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
