'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crosshair, Target, Activity, TrendingDown, Flag, Zap } from 'lucide-react';
import Typewriter from '@/components/Typewriter';
import { useRecon } from '@/contexts/ReconContext';
import { calculateBMR, calculateTDEE, lbsToKg, feetInchesToCm, kgToLbs, cmToFeetInches } from '@/lib/calculations';
import { Gender, Intensity, Operative } from '@/types';

type UnitSystem = 'imperial' | 'metric';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'intense';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  intense: 1.9,
};

const ACTIVITY_OPTIONS: { value: ActivityLevel; title: string; subtitle: string; description: string }[] = [
  { value: 'sedentary', title: 'DESK OPERATIVE', subtitle: '(Sedentary)', description: 'Office work, minimal physical activity. The analyst behind the lines.' },
  { value: 'light', title: 'PATROL DUTY', subtitle: '(Light Active)', description: 'Light exercise 1-3 days/week. Walking the perimeter.' },
  { value: 'moderate', title: 'FIELD AGENT', subtitle: '(Moderate)', description: 'Moderate exercise 3-5 days/week. Regular field operations.' },
  { value: 'active', title: 'COMBAT READY', subtitle: '(Very Active)', description: 'Hard exercise 6-7 days/week. Always mission-ready.' },
  { value: 'intense', title: 'SPECIAL FORCES', subtitle: '(Extreme)', description: 'Intense daily training + physical job. Elite operator status.' },
];

export default function InductionPage() {
  const router = useRouter();
  const { operative, setOperative, isLoading } = useRecon();
  const [step, setStep] = useState(1);
  const [showContent, setShowContent] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Form state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [callsign, setCallsign] = useState('');
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [intensity, setIntensity] = useState<Intensity | null>(null);

  // Calculated values
  const [calculatedBMR, setCalculatedBMR] = useState(0);
  const [calculatedTDEE, setCalculatedTDEE] = useState(0);

  useEffect(() => {
    if (!isLoading && operative?.inductionComplete) {
      router.replace('/dashboard');
    }
  }, [isLoading, operative, router]);

  useEffect(() => {
    if (!isTransitioning) {
      setShowContent(false);
      const timer = setTimeout(() => setShowContent(true), 500);
      return () => clearTimeout(timer);
    }
  }, [step, isTransitioning]);

  // Calculate BMR when stats change
  useEffect(() => {
    if (weight && (heightCm || (heightFeet && heightInches)) && age && gender) {
      const weightKg = unitSystem === 'imperial' ? lbsToKg(parseFloat(weight)) : parseFloat(weight);
      const heightInCm = unitSystem === 'imperial'
        ? feetInchesToCm(parseInt(heightFeet), parseInt(heightInches) || 0)
        : parseFloat(heightCm);

      const bmr = calculateBMR(weightKg, heightInCm, parseInt(age), gender);
      setCalculatedBMR(Math.round(bmr));
    }
  }, [weight, heightFeet, heightInches, heightCm, age, gender, unitSystem]);

  // Calculate TDEE when activity level changes
  useEffect(() => {
    if (calculatedBMR && activityLevel) {
      const tdee = calculatedBMR * ACTIVITY_MULTIPLIERS[activityLevel];
      setCalculatedTDEE(Math.round(tdee));
    }
  }, [calculatedBMR, activityLevel]);

  const nextStep = useCallback(() => {
    setIsTransitioning(true);
    setShowContent(false);
    setTimeout(() => {
      setStep(prev => prev + 1);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const getWeightKg = () => {
    return unitSystem === 'imperial' ? lbsToKg(parseFloat(weight)) : parseFloat(weight);
  };

  const getHeightCm = () => {
    return unitSystem === 'imperial'
      ? feetInchesToCm(parseInt(heightFeet), parseInt(heightInches) || 0)
      : parseFloat(heightCm);
  };

  const getDeficitAmount = () => intensity === 'standard' ? 500 : 1000;

  const getWeeklyLoss = () => {
    // 3500 calories = 1 lb of fat
    const deficit = getDeficitAmount();
    const weeklyDeficit = deficit * 7;
    const lbsPerWeek = weeklyDeficit / 3500;
    return unitSystem === 'imperial'
      ? `${lbsPerWeek.toFixed(1)} lbs`
      : `${(lbsPerWeek * 0.453592).toFixed(1)} kg`;
  };

  const getProjectedWeight = (weeks: number) => {
    const deficit = getDeficitAmount();
    const weeklyDeficit = deficit * 7;
    const lbsLost = (weeklyDeficit / 3500) * weeks;
    const currentLbs = unitSystem === 'imperial' ? parseFloat(weight) : kgToLbs(parseFloat(weight));
    const projectedLbs = currentLbs - lbsLost;

    return unitSystem === 'imperial'
      ? `${Math.round(projectedLbs)} lbs`
      : `${Math.round(projectedLbs * 0.453592)} kg`;
  };

  const getDailyAmmo = () => calculatedTDEE - getDeficitAmount();

  const handleComplete = () => {
    if (!callsign || !weight || !age || !gender || !activityLevel || !intensity) return;

    const weightKg = getWeightKg();
    const heightInCm = getHeightCm();
    const dailyAmmo = getDailyAmmo();

    const newOperative: Operative = {
      callsign,
      currentMass: weightKg,
      height: heightInCm,
      age: parseInt(age),
      gender,
      intensity,
      bmr: calculatedBMR,
      tdee: calculatedTDEE,
      dailyAmmo,
      inductionComplete: true,
      createdAt: new Date().toISOString(),
    };

    setOperative(newOperative);
    router.push('/dashboard');
  };

  const canProceedFromDossier = callsign && weight && age && gender &&
    (unitSystem === 'imperial' ? heightFeet : heightCm);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center tactical-grid">
        <p className="text-glow">LOADING SYSTEMS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 tactical-grid">
      <AnimatePresence mode="wait">

        {/* Step 1: The Gatekeeper */}
        {step === 1 && (
          <motion.div
            key="gatekeeper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl w-full text-center"
          >
            {showContent && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <Shield className="w-16 h-16 mx-auto mb-6 text-[#32CD32]" strokeWidth={1} />
                </motion.div>

                <div className="mb-12">
                  <Typewriter
                    text="THIS IS NOT FOR THE WEAK."
                    speed={40}
                    className="block text-2xl md:text-3xl text-glow mb-4"
                  />
                  <Typewriter
                    text="IF YOU WANT COMFORT, DELETE THIS APP."
                    speed={40}
                    delay={1500}
                    className="block text-xl md:text-2xl text-[#FFB000] text-glow-amber mb-4"
                  />
                  <Typewriter
                    text="IF YOU WANT RESULTS, STAY."
                    speed={40}
                    delay={3500}
                    className="block text-xl md:text-2xl text-glow"
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5.5 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <button onClick={nextStep} className="tactical-btn text-lg">
                    [ I AM NOT SOFT ]
                  </button>
                  <button onClick={() => window.close()} className="tactical-btn tactical-btn-danger text-lg">
                    [ EXIT ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 2: Unit Selection */}
        {step === 2 && (
          <motion.div
            key="units"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center">
                  <Typewriter
                    text="SELECT MEASUREMENT PROTOCOL"
                    speed={50}
                    className="block text-xl text-glow"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="space-y-4"
                >
                  <button
                    onClick={() => { setUnitSystem('imperial'); nextStep(); }}
                    className={`w-full terminal-border p-6 text-left transition-all hover:bg-[#32CD32]/10`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg text-glow">IMPERIAL SYSTEM</span>
                      <span className="text-[#FFB000]">US STANDARD</span>
                    </div>
                    <p className="text-sm text-[#32CD32]/70">
                      Pounds (lbs) and Feet/Inches (ft/in)
                    </p>
                  </button>

                  <button
                    onClick={() => { setUnitSystem('metric'); nextStep(); }}
                    className={`w-full terminal-border p-6 text-left transition-all hover:bg-[#32CD32]/10`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg text-glow">METRIC SYSTEM</span>
                      <span className="text-[#FFB000]">INTERNATIONAL</span>
                    </div>
                    <p className="text-sm text-[#32CD32]/70">
                      Kilograms (kg) and Centimeters (cm)
                    </p>
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: The Dossier */}
        {step === 3 && (
          <motion.div
            key="dossier"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                  <Crosshair className="w-12 h-12 mx-auto mb-4 text-[#32CD32]" strokeWidth={1} />
                  <Typewriter
                    text="COMPILING DOSSIER..."
                    speed={50}
                    className="block text-xl text-center text-glow mb-2"
                  />
                  <p className="text-center text-[#FFB000] text-sm">CLASSIFICATION: TOP SECRET</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="space-y-6 terminal-border p-6"
                >
                  <div>
                    <label className="block text-sm text-[#FFB000] mb-2">&gt; CALLSIGN</label>
                    <input
                      type="text"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                      placeholder="ENTER YOUR CALLSIGN..."
                      className="tactical-input uppercase"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#FFB000] mb-2">
                        &gt; CURRENT MASS ({unitSystem === 'imperial' ? 'LBS' : 'KG'})
                      </label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder={unitSystem === 'imperial' ? 'LBS' : 'KG'}
                        className="tactical-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#FFB000] mb-2">&gt; AGE (YEARS)</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="YEARS"
                        className="tactical-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-[#FFB000] mb-2">&gt; HEIGHT</label>
                    {unitSystem === 'imperial' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={heightFeet}
                          onChange={(e) => setHeightFeet(e.target.value)}
                          placeholder="FEET"
                          className="tactical-input"
                        />
                        <input
                          type="number"
                          value={heightInches}
                          onChange={(e) => setHeightInches(e.target.value)}
                          placeholder="INCHES"
                          className="tactical-input"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="CENTIMETERS"
                        className="tactical-input"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-[#FFB000] mb-2">&gt; BIOLOGICAL CLASSIFICATION</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setGender('male')}
                        className={`tactical-btn ${gender === 'male' ? 'bg-[#32CD32]/20' : ''}`}
                      >
                        MALE
                      </button>
                      <button
                        onClick={() => setGender('female')}
                        className={`tactical-btn ${gender === 'female' ? 'bg-[#32CD32]/20' : ''}`}
                      >
                        FEMALE
                      </button>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: canProceedFromDossier ? 1 : 0.3 }}
                    className="pt-4"
                  >
                    <button
                      onClick={nextStep}
                      disabled={!canProceedFromDossier}
                      className="tactical-btn w-full disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      [ ANALYZE BIOMETRICS ]
                    </button>
                  </motion.div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 4: BMR Reveal */}
        {step === 4 && (
          <motion.div
            key="bmr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full text-center"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-[#FFB000]" strokeWidth={1} />
                  <Typewriter
                    text="BIOMETRIC ANALYSIS COMPLETE"
                    speed={50}
                    className="block text-xl text-glow mb-4"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 }}
                  className="terminal-border p-8 mb-6"
                >
                  <p className="text-sm text-[#FFB000] mb-2">BASAL METABOLIC RATE (BMR)</p>
                  <p className="text-5xl text-glow mb-4">{calculatedBMR}</p>
                  <p className="text-sm text-[#32CD32]/70">CALORIES BURNED AT REST PER DAY</p>

                  <div className="mt-6 pt-6 border-t border-[#32CD32]/30">
                    <p className="text-sm text-[#32CD32]/70 mb-4">
                      This is the energy your body requires to maintain basic functions while at complete rest.
                      Your actual daily expenditure depends on your activity level.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                >
                  <button onClick={nextStep} className="tactical-btn">
                    [ PROCEED TO ACTIVITY ASSESSMENT ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 5: Activity Level */}
        {step === 5 && (
          <motion.div
            key="activity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-[#32CD32]" strokeWidth={1} />
                  <Typewriter
                    text="OPERATIONAL TEMPO ASSESSMENT"
                    speed={50}
                    className="block text-xl text-glow mb-2"
                  />
                  <p className="text-sm text-[#32CD32]/70">Select your typical weekly activity level</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="space-y-3 max-h-[60vh] overflow-y-auto"
                >
                  {ACTIVITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setActivityLevel(option.value)}
                      className={`w-full terminal-border p-4 text-left transition-all hover:bg-[#32CD32]/10 ${
                        activityLevel === option.value ? 'bg-[#32CD32]/20 border-[#FFB000]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-glow">{option.title}</span>
                        <span className="text-[#FFB000] text-sm">{option.subtitle}</span>
                      </div>
                      <p className="text-sm text-[#32CD32]/70">{option.description}</p>
                      {activityLevel === option.value && calculatedBMR > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#32CD32]/30">
                          <p className="text-sm">
                            <span className="text-[#FFB000]">TDEE: </span>
                            <span className="text-glow">{Math.round(calculatedBMR * ACTIVITY_MULTIPLIERS[option.value])} KCAL/DAY</span>
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: activityLevel ? 1 : 0.3 }}
                  className="mt-6"
                >
                  <button
                    onClick={nextStep}
                    disabled={!activityLevel}
                    className="tactical-btn w-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    [ PROCEED TO MISSION PARAMETERS ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 6: TDEE Reveal & Deficit Selection */}
        {step === 6 && (
          <motion.div
            key="deficit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-[#32CD32]" strokeWidth={1} />
                  <Typewriter
                    text="DAILY ENERGY EXPENDITURE CALCULATED"
                    speed={40}
                    className="block text-lg text-glow"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="terminal-border p-6 mb-6 text-center"
                >
                  <p className="text-sm text-[#FFB000] mb-2">YOUR TDEE (MAINTENANCE CALORIES)</p>
                  <p className="text-4xl text-glow mb-2">{calculatedTDEE}</p>
                  <p className="text-sm text-[#32CD32]/70">KCAL TO MAINTAIN CURRENT MASS</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="mb-4"
                >
                  <p className="text-center text-[#FFB000] mb-4">SELECT TACTICAL INTENSITY</p>

                  <div className="space-y-3">
                    <button
                      onClick={() => setIntensity('standard')}
                      className={`w-full terminal-border p-5 text-left transition-all hover:bg-[#32CD32]/10 ${
                        intensity === 'standard' ? 'bg-[#32CD32]/20 border-[#FFB000]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg text-glow">STANDARD DEPLOYMENT</span>
                          <span className="px-2 py-0.5 bg-[#FFB000]/20 text-[#FFB000] text-xs rounded">RECOMMENDED</span>
                        </div>
                        <span className="text-[#FFB000]">-500 KCAL</span>
                      </div>
                      <p className="text-sm text-[#32CD32]/70 mb-3">
                        Sustainable, steady progress. Optimal for long-term success and muscle retention.
                      </p>
                      <div className="flex justify-between text-sm border-t border-[#32CD32]/30 pt-3">
                        <span className="text-[#32CD32]/70">Weekly Loss:</span>
                        <span className="text-glow">~{unitSystem === 'imperial' ? '1.0 lbs' : '0.45 kg'}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#32CD32]/70">Daily Ammo:</span>
                        <span className="text-glow">{calculatedTDEE - 500} KCAL</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setIntensity('special-ops')}
                      className={`w-full terminal-border p-5 text-left transition-all hover:bg-[#FF0000]/10 ${
                        intensity === 'special-ops' ? 'bg-[#FF0000]/20 border-[#FF0000]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-lg ${intensity === 'special-ops' ? 'text-glow-red text-[#FF0000]' : 'text-glow'}`}>
                          SPECIAL OPS
                        </span>
                        <span className="text-[#FF0000]">-1000 KCAL</span>
                      </div>
                      <p className={`text-sm mb-3 ${intensity === 'special-ops' ? 'text-[#FF0000]/70' : 'text-[#32CD32]/70'}`}>
                        Aggressive deficit. Higher difficulty. Requires iron discipline.
                      </p>
                      <div className={`flex justify-between text-sm border-t pt-3 ${intensity === 'special-ops' ? 'border-[#FF0000]/30' : 'border-[#32CD32]/30'}`}>
                        <span className={intensity === 'special-ops' ? 'text-[#FF0000]/70' : 'text-[#32CD32]/70'}>Weekly Loss:</span>
                        <span className={intensity === 'special-ops' ? 'text-[#FF0000]' : 'text-glow'}>~{unitSystem === 'imperial' ? '2.0 lbs' : '0.9 kg'}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className={intensity === 'special-ops' ? 'text-[#FF0000]/70' : 'text-[#32CD32]/70'}>Daily Ammo:</span>
                        <span className={intensity === 'special-ops' ? 'text-[#FF0000]' : 'text-glow'}>{calculatedTDEE - 1000} KCAL</span>
                      </div>
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: intensity ? 1 : 0.3 }}
                  className="mt-6"
                >
                  <button
                    onClick={nextStep}
                    disabled={!intensity}
                    className="tactical-btn w-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    [ VIEW MISSION PROJECTION ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 7: Mission Projection */}
        {step === 7 && (
          <motion.div
            key="projection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
                  <TrendingDown className="w-12 h-12 mx-auto mb-4 text-[#32CD32]" strokeWidth={1} />
                  <Typewriter
                    text="MISSION PROJECTION"
                    speed={50}
                    className="block text-xl text-glow mb-2"
                  />
                  <p className="text-sm text-[#32CD32]/70">If you maintain discipline, here&apos;s your trajectory</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="terminal-border p-6 mb-6"
                >
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-[#32CD32]/5 rounded">
                      <p className="text-xs text-[#FFB000] mb-1">CURRENT MASS</p>
                      <p className="text-2xl text-glow">
                        {unitSystem === 'imperial' ? `${weight} lbs` : `${weight} kg`}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-[#32CD32]/5 rounded">
                      <p className="text-xs text-[#FFB000] mb-1">DAILY AMMO</p>
                      <p className="text-2xl text-glow">{getDailyAmmo()}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#32CD32]/20">
                      <span className="text-[#32CD32]/70">4 WEEKS</span>
                      <span className="text-glow">{getProjectedWeight(4)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#32CD32]/20">
                      <span className="text-[#32CD32]/70">8 WEEKS</span>
                      <span className="text-glow">{getProjectedWeight(8)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#32CD32]/20">
                      <span className="text-[#32CD32]/70">12 WEEKS</span>
                      <span className="text-glow">{getProjectedWeight(12)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[#FFB000]">6 MONTHS</span>
                      <span className="text-glow text-xl">{getProjectedWeight(26)}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#32CD32]/30">
                    <p className="text-sm text-[#32CD32]/70 text-center">
                      *Projections assume consistent adherence. Results depend on your discipline.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                >
                  <button onClick={nextStep} className="tactical-btn w-full">
                    [ I UNDERSTAND THE MISSION ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 8: The Rules */}
        {step === 8 && (
          <motion.div
            key="rules"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-xl w-full"
          >
            {showContent && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
                  <Flag className="w-12 h-12 mx-auto mb-4 text-[#FFB000]" strokeWidth={1} />
                  <Typewriter
                    text="THE RULES OF ENGAGEMENT"
                    speed={50}
                    className="block text-xl text-glow-amber text-[#FFB000]"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="terminal-border p-6 mb-6 space-y-4"
                >
                  <div className="flex gap-4">
                    <span className="text-[#FFB000] font-bold">01</span>
                    <p className="text-glow">LOG EVERY MEAL. No exceptions. What isn&apos;t tracked didn&apos;t happen.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#FFB000] font-bold">02</span>
                    <p className="text-glow">STAY WITHIN YOUR AMMO. Your daily limit is law.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#FFB000] font-bold">03</span>
                    <p className="text-glow">WEIGH IN WEEKLY. Data drives decisions.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#FFB000] font-bold">04</span>
                    <p className="text-glow">ONE BAD MEAL IS NOT FAILURE. One bad week is not failure. Quitting is failure.</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#FFB000] font-bold">05</span>
                    <p className="text-glow">TRUST THE PROCESS. The math doesn&apos;t lie. Time + consistency = results.</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3 }}
                >
                  <button onClick={nextStep} className="tactical-btn w-full">
                    [ I ACCEPT THESE TERMS ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 9: The Oath */}
        {step === 9 && (
          <motion.div
            key="oath"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl w-full text-center"
          >
            {showContent && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 mx-auto mb-6 border-2 border-[#32CD32] rounded-full flex items-center justify-center">
                    <span className="text-3xl text-glow">★</span>
                  </div>
                </motion.div>

                <div className="terminal-border p-8 mb-8">
                  <Typewriter
                    text={`OPERATIVE ${callsign},`}
                    speed={50}
                    className="block text-xl text-[#FFB000] text-glow-amber mb-6"
                  />
                  <Typewriter
                    text="FROM THIS MOMENT, YOUR BODY IS A PIECE OF EQUIPMENT."
                    speed={30}
                    delay={1500}
                    className="block text-lg text-glow mb-4"
                  />
                  <Typewriter
                    text="YOU DO NOT SNACK—YOU REFUEL."
                    speed={30}
                    delay={4000}
                    className="block text-lg text-glow mb-4"
                  />
                  <Typewriter
                    text="YOU DO NOT INDULGE—YOU EXECUTE."
                    speed={30}
                    delay={5500}
                    className="block text-lg text-glow mb-4"
                  />
                  <Typewriter
                    text="FAILURE IS NOT AN OPTION."
                    speed={30}
                    delay={7000}
                    className="block text-lg text-glow mb-6"
                  />
                  <Typewriter
                    text="DO YOU AFFIRM?"
                    speed={80}
                    delay={9000}
                    className="block text-2xl text-[#FFB000] text-glow-amber"
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 11 }}
                >
                  <button
                    onClick={handleComplete}
                    className="tactical-btn text-xl px-12 py-4"
                  >
                    [ AFFIRMATIVE ]
                  </button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
