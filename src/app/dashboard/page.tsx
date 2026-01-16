'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Crosshair, Plus, Scale, Radio, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useRecon } from '@/contexts/ReconContext';
import { INTEL_BRIEFINGS, FuelLog } from '@/types';
import LogIntelModal from '@/components/LogIntelModal';

export default function DashboardPage() {
  const router = useRouter();
  const {
    operative,
    todayLog,
    isLoading,
    addFuelLog,
    logWeight,
    getCaloriesRemaining,
    getTodayMacros,
    getRecentFoods
  } = useRecon();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !operative?.inductionComplete) {
      router.replace('/induction');
    }
  }, [isLoading, operative, router]);

  if (isLoading || !operative) {
    return (
      <div className="min-h-screen flex items-center justify-center tactical-grid">
        <p className="text-glow">INITIALIZING COMMAND CENTER...</p>
      </div>
    );
  }

  const caloriesRemaining = getCaloriesRemaining();
  const caloriesConsumed = todayLog?.totalCalories || 0;
  const percentRemaining = Math.max(0, Math.min(100, (caloriesRemaining / operative.dailyAmmo) * 100));
  const isOverLimit = caloriesRemaining < 0;
  const todayMacros = getTodayMacros();

  // Get today's intel briefing (cycle through based on days since signup)
  const daysSinceStart = Math.floor((Date.now() - new Date(operative.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const todayIntel = INTEL_BRIEFINGS[daysSinceStart % INTEL_BRIEFINGS.length];

  const handleAddFuel = (log: Omit<FuelLog, 'id' | 'timestamp'>) => {
    addFuelLog(log);
    setStatusMessage('INTEL RECEIVED. FUEL ALLOCATED.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleLogWeight = () => {
    if (!weightInput) return;

    const weightKg = parseFloat(weightInput) * 0.453592;
    logWeight(weightKg);

    setStatusMessage('RECON DATA UPDATED. MASS LOGGED.');
    setTimeout(() => setStatusMessage(null), 3000);

    setWeightInput('');
    setShowWeightModal(false);
  };

  return (
    <div className="min-h-screen tactical-grid p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Crosshair className="w-8 h-8 text-[#32CD32]" strokeWidth={1} />
          <div>
            <h1 className="text-lg text-glow">OPERATION: RECON</h1>
            <p className="text-sm text-[#FFB000]">OPERATIVE: {operative.callsign}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#32CD32]/60">DAILY AMMO</p>
          <p className="text-lg text-glow">{operative.dailyAmmo} KCAL</p>
        </div>
      </header>

      {/* Status Message */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 p-3 terminal-border bg-[#32CD32]/10"
        >
          <p className="text-sm text-glow text-center">{statusMessage}</p>
        </motion.div>
      )}

      {/* Intelligence Feed */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 terminal-border p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-[#FFB000]" />
          <span className="text-xs text-[#FFB000]">DAILY INTEL // {todayIntel.title}</span>
        </div>
        <p className="text-sm text-[#32CD32]/80 mb-2">CODENAME: {todayIntel.codename}</p>
        <p className="text-glow">&quot;{todayIntel.message}&quot;</p>
      </motion.section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Fuel Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`terminal-border p-4 ${isOverLimit ? 'border-[#FF0000]' : ''}`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[#FFB000]">AMMO REMAINING</span>
            {isOverLimit && <AlertTriangle className="w-4 h-4 text-[#FF0000]" />}
          </div>

          {/* Vertical Gauge */}
          <div className="flex items-end justify-center gap-4 mb-4">
            <div className={`ammo-gauge w-12 h-48 ${isOverLimit ? 'ammo-gauge-danger' : ''}`}>
              <div
                className="ammo-gauge-fill absolute bottom-0 w-full transition-all duration-500"
                style={{ height: `${percentRemaining}%` }}
              />
              {/* Gauge markers */}
              {[0, 25, 50, 75, 100].map((mark) => (
                <div
                  key={mark}
                  className="absolute w-full border-t border-[#32CD32]/30"
                  style={{ bottom: `${mark}%` }}
                >
                  <span className="absolute -right-8 -top-2 text-[10px] text-[#32CD32]/50">
                    {mark}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className={`text-3xl font-bold ${isOverLimit ? 'text-[#FF0000] text-glow-red' : 'text-glow'}`}>
              {caloriesRemaining}
            </p>
            <p className="text-xs text-[#32CD32]/60">KCAL REMAINING</p>
          </div>
        </motion.div>

        {/* Today's Logs + Macros */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="terminal-border p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-[#FFB000]">FUEL CONSUMED</span>
            <span className="text-lg text-glow">{caloriesConsumed}</span>
          </div>

          {/* Macro Breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-4 p-2 bg-[#32CD32]/5 border border-[#32CD32]/20">
            <div className="text-center">
              <p className="text-lg font-bold text-[#32CD32]">{todayMacros.protein}g</p>
              <p className="text-[10px] text-[#32CD32]/60">PROTEIN</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#FFB000]">{todayMacros.carbs}g</p>
              <p className="text-[10px] text-[#FFB000]/60">CARBS</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#FF6B6B]">{todayMacros.fat}g</p>
              <p className="text-[10px] text-[#FF6B6B]/60">FAT</p>
            </div>
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
            {todayLog?.fuelLogs.length ? (
              todayLog.fuelLogs.map((log) => (
                <div key={log.id} className="border-b border-[#32CD32]/20 pb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#32CD32]/70 truncate mr-2">{log.description}</span>
                    <span className="text-glow">{log.calories}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-[#32CD32]/50">
                    <span>P:{log.macros?.protein || 0}g</span>
                    <span>C:{log.macros?.carbs || 0}g</span>
                    <span>F:{log.macros?.fat || 0}g</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#32CD32]/40 text-center py-4">NO INTEL LOGGED</p>
            )}
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="tactical-btn w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            LOG INTEL
          </button>
        </motion.div>

        {/* Status / Weight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="terminal-border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-[#FFB000]" />
            <span className="text-xs text-[#FFB000]">RECON STATUS</span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#32CD32]/60">CURRENT MASS</p>
              <p className="text-2xl text-glow">
                {Math.round(operative.currentMass * 2.20462)} LBS
              </p>
            </div>

            <div>
              <p className="text-xs text-[#32CD32]/60">BASE METABOLISM</p>
              <p className="text-lg text-glow">{operative.bmr} KCAL</p>
            </div>

            <div>
              <p className="text-xs text-[#32CD32]/60">INTENSITY</p>
              <p className={`text-sm ${operative.intensity === 'special-ops' ? 'text-[#FF0000]' : 'text-[#32CD32]'}`}>
                {operative.intensity === 'special-ops' ? 'SPECIAL OPS (-1000)' : 'STANDARD (-500)'}
              </p>
            </div>

            <button
              onClick={() => setShowWeightModal(true)}
              className="tactical-btn w-full"
            >
              UPDATE MASS
            </button>
          </div>
        </motion.div>
      </div>

      {/* Discipline Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`terminal-border p-4 ${isOverLimit ? 'border-[#FF0000] bg-[#FF0000]/5' : 'bg-[#32CD32]/5'}`}
      >
        <div className="flex items-center gap-3">
          {isOverLimit ? (
            <>
              <AlertTriangle className="w-6 h-6 text-[#FF0000]" />
              <div>
                <p className="text-[#FF0000] text-glow-red">STATUS: DISCIPLINE COLLAPSE</p>
                <p className="text-sm text-[#FF0000]/70">RE-ENGAGE IMMEDIATELY. YOU ARE {Math.abs(caloriesRemaining)} KCAL OVER LIMIT.</p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 text-[#32CD32]" />
              <div>
                <p className="text-glow">STATUS: MISSION ON TRACK</p>
                <p className="text-sm text-[#32CD32]/70">STAY VIGILANT. {caloriesRemaining} KCAL REMAINING.</p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Log Intel Modal */}
      <LogIntelModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onAddFuel={handleAddFuel}
        recentFoods={getRecentFoods()}
      />

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="terminal-border bg-[#050505] p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-glow">UPDATE MASS</h3>
              <button onClick={() => setShowWeightModal(false)} className="text-[#32CD32]/60 hover:text-[#32CD32]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#FFB000] mb-2">&gt; CURRENT MASS (LBS)</label>
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="ENTER WEIGHT IN LBS..."
                  className="tactical-input"
                  autoFocus
                />
              </div>

              <button
                onClick={handleLogWeight}
                disabled={!weightInput}
                className="tactical-btn w-full disabled:opacity-30"
              >
                [ CONFIRM UPDATE ]
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
