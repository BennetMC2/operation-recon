'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, Barcode, Search, PenLine, Clock,
  Crosshair, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { FuelLog, FoodAnalysis, BarcodeProduct, Macros } from '@/types';

interface LogIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFuel: (log: Omit<FuelLog, 'id' | 'timestamp'>) => void;
  recentFoods: FuelLog[];
}

type InputMode = 'photo' | 'barcode' | 'search' | 'manual' | 'recent';

interface SearchResult {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  macros: Macros;
  servingSize: string;
}

export default function LogIntelModal({ isOpen, onClose, onAddFuel, recentFoods }: LogIntelModalProps) {
  const [mode, setMode] = useState<InputMode>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Photo mode state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Barcode mode state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Manual mode state
  const [manualEntry, setManualEntry] = useState({
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    servingSize: '',
  });

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup barcode scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Scanner might already be stopped
      }
      scannerRef.current = null;
      setScannerActive(false);
    }
  }, []);

  // Reset state when modal closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      stopScanner();
      setCapturedImage(null);
      setAnalysis(null);
      setScannedProduct(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setError(null);
      setSuccess(false);
      setManualEntry({
        description: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        servingSize: '',
      });
    }
  }, [isOpen, stopCamera, stopScanner]);

  useEffect(() => {
    stopCamera();
    stopScanner();
    setCapturedImage(null);
    setAnalysis(null);
    setScannedProduct(null);
    setError(null);
  }, [mode, stopCamera, stopScanner]);

  // Start camera for photo mode
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('CAMERA ACCESS DENIED. CHECK PERMISSIONS.');
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        analyzePhoto(imageData);
      }
    }
  };

  // Analyze captured photo
  const analyzePhoto = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data: FoodAnalysis = await response.json();
      setAnalysis(data);
    } catch {
      setError('VISUAL ANALYSIS FAILED. TRY MANUAL ENTRY.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start barcode scanner
  const startScanner = async () => {
    if (scannerRef.current) return;

    try {
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        async (decodedText) => {
          await stopScanner();
          lookupBarcode(decodedText);
        },
        () => {} // Ignore errors during scanning
      );

      setScannerActive(true);
    } catch {
      setError('SCANNER ACCESS DENIED. CHECK PERMISSIONS.');
    }
  };

  // Lookup barcode
  const lookupBarcode = async (code: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/barcode/${code}`);

      if (response.status === 404) {
        setError('PRODUCT NOT IN DATABASE. TRY SEARCH OR MANUAL.');
        return;
      }

      if (!response.ok) throw new Error('Lookup failed');

      const data: BarcodeProduct = await response.json();
      setScannedProduct(data);
    } catch {
      setError('BARCODE LOOKUP FAILED.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Search foods
  const searchFoods = async () => {
    if (searchQuery.length < 2) return;

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/search-food?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch {
      setError('SEARCH FAILED. TRY AGAIN.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add fuel entry
  const addEntry = (data: {
    description: string;
    calories: number;
    macros: Macros;
    servingSize?: string;
    barcode?: string;
    photoUrl?: string;
    source: FuelLog['source'];
  }) => {
    onAddFuel({
      description: data.description,
      calories: data.calories,
      macros: data.macros,
      servingSize: data.servingSize,
      barcode: data.barcode,
      photoUrl: data.photoUrl,
      source: data.source,
    });
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Confirm photo analysis
  const confirmPhotoAnalysis = () => {
    if (analysis) {
      addEntry({
        description: analysis.name,
        calories: analysis.calories,
        macros: analysis.macros,
        servingSize: analysis.servingSize,
        photoUrl: capturedImage || undefined,
        source: 'photo',
      });
    }
  };

  // Confirm barcode product
  const confirmBarcodeProduct = () => {
    if (scannedProduct) {
      addEntry({
        description: scannedProduct.brand
          ? `${scannedProduct.brand} - ${scannedProduct.name}`
          : scannedProduct.name,
        calories: scannedProduct.calories,
        macros: scannedProduct.macros,
        servingSize: scannedProduct.servingSize,
        barcode: scannedProduct.barcode,
        source: 'barcode',
      });
    }
  };

  // Confirm search selection
  const confirmSearchSelection = () => {
    if (selectedFood) {
      addEntry({
        description: selectedFood.brand
          ? `${selectedFood.brand} - ${selectedFood.name}`
          : selectedFood.name,
        calories: selectedFood.calories,
        macros: selectedFood.macros,
        servingSize: selectedFood.servingSize,
        source: 'search',
      });
    }
  };

  // Submit manual entry
  const submitManualEntry = () => {
    const calories = parseInt(manualEntry.calories) || 0;
    if (!manualEntry.description || !calories) {
      setError('ENTER DESCRIPTION AND CALORIES.');
      return;
    }

    addEntry({
      description: manualEntry.description,
      calories,
      macros: {
        protein: parseInt(manualEntry.protein) || 0,
        carbs: parseInt(manualEntry.carbs) || 0,
        fat: parseInt(manualEntry.fat) || 0,
      },
      servingSize: manualEntry.servingSize || undefined,
      source: 'manual',
    });
  };

  // Quick add recent food
  const quickAddRecent = (food: FuelLog) => {
    addEntry({
      description: food.description,
      calories: food.calories,
      macros: food.macros,
      servingSize: food.servingSize,
      source: 'recent',
    });
  };

  if (!isOpen) return null;

  const modeButtons = [
    { id: 'barcode' as InputMode, icon: Barcode, label: 'BARCODE' },
    { id: 'search' as InputMode, icon: Search, label: 'SEARCH' },
    { id: 'manual' as InputMode, icon: PenLine, label: 'MANUAL' },
    { id: 'recent' as InputMode, icon: Clock, label: 'RECENT' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#050505] terminal-border w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#32CD32]/30">
            <h2 className="text-lg text-glow font-bold tracking-wider">
              LOG INTEL
            </h2>
            <button onClick={onClose} className="text-[#32CD32] hover:text-white">
              <X size={24} />
            </button>
          </div>

          <p className="px-4 py-3 text-sm text-[#32CD32]/70" role="status">
            Photo analysis is temporarily unavailable. Use barcode lookup, search or manual entry.
          </p>

          {/* Mode selector */}
          <div className="flex border-b border-[#32CD32]/30">
            {modeButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setMode(btn.id)}
                className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-all ${
                  mode === btn.id
                    ? 'bg-[#32CD32]/20 text-[#32CD32]'
                    : 'text-[#32CD32]/50 hover:text-[#32CD32]/80'
                }`}
              >
                <btn.icon size={20} />
                <span className="text-[10px] tracking-wider">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {/* Success overlay */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-[#050505]/95 flex flex-col items-center justify-center z-10"
              >
                <CheckCircle2 size={64} className="text-[#32CD32] mb-4" />
                <p className="text-[#32CD32] text-xl font-bold">INTEL LOGGED</p>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-[#FF0000]/10 border border-[#FF0000]/50 text-[#FF0000]">
                <AlertTriangle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Photo Mode */}
            {mode === 'photo' && (
              <div className="space-y-4">
                {!capturedImage ? (
                  <>
                    <div className="relative aspect-[4/3] bg-black border border-[#32CD32]/30 overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Crosshair size={64} className="text-[#32CD32]/50" />
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2">
                      <button
                        onClick={startCamera}
                        className="flex-1 tactical-btn"
                      >
                        ACTIVATE CAMERA
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="flex-1 tactical-btn"
                      >
                        CAPTURE TARGET
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative aspect-[4/3] bg-black border border-[#32CD32]/30 overflow-hidden">
                      <img
                        src={capturedImage}
                        alt="Captured food"
                        className="w-full h-full object-cover night-vision"
                      />
                    </div>

                    {isProcessing && (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="animate-spin text-[#32CD32]" />
                        <span className="text-[#32CD32]">ANALYZING TARGET...</span>
                      </div>
                    )}

                    {analysis && (
                      <div className="space-y-3">
                        <div className="p-3 bg-[#32CD32]/10 border border-[#32CD32]/30">
                          <p className="text-lg font-bold text-[#32CD32] mb-2">
                            {analysis.name}
                          </p>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div className="text-center">
                              <p className="text-[#FFB000] font-bold">{analysis.calories}</p>
                              <p className="text-[#32CD32]/60 text-xs">KCAL</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[#32CD32] font-bold">{analysis.macros.protein}g</p>
                              <p className="text-[#32CD32]/60 text-xs">PROTEIN</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[#32CD32] font-bold">{analysis.macros.carbs}g</p>
                              <p className="text-[#32CD32]/60 text-xs">CARBS</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[#32CD32] font-bold">{analysis.macros.fat}g</p>
                              <p className="text-[#32CD32]/60 text-xs">FAT</p>
                            </div>
                          </div>
                          <p className="text-[#32CD32]/60 text-xs mt-2">
                            SERVING: {analysis.servingSize} | CONFIDENCE: {analysis.confidence.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setCapturedImage(null);
                              setAnalysis(null);
                            }}
                            className="flex-1 tactical-btn tactical-btn-danger"
                          >
                            RETAKE
                          </button>
                          <button
                            onClick={confirmPhotoAnalysis}
                            className="flex-1 tactical-btn"
                          >
                            CONFIRM
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Barcode Mode */}
            {mode === 'barcode' && (
              <div className="space-y-4">
                {!scannedProduct ? (
                  <>
                    <div
                      id="barcode-reader"
                      className="aspect-[4/3] bg-black border border-[#32CD32]/30"
                    />
                    {!scannerActive && (
                      <button
                        onClick={startScanner}
                        disabled={isProcessing}
                        className="w-full tactical-btn"
                      >
                        {isProcessing ? 'SCANNING...' : 'ACTIVATE SCANNER'}
                      </button>
                    )}
                    {scannerActive && (
                      <p className="text-center text-[#32CD32]/60 text-sm">
                        POSITION BARCODE IN FRAME
                      </p>
                    )}
                    {isProcessing && (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="animate-spin text-[#32CD32]" />
                        <span className="text-[#32CD32]">QUERYING DATABASE...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#32CD32]/10 border border-[#32CD32]/30">
                      {scannedProduct.brand && (
                        <p className="text-[#32CD32]/60 text-xs mb-1">
                          {scannedProduct.brand}
                        </p>
                      )}
                      <p className="text-lg font-bold text-[#32CD32] mb-2">
                        {scannedProduct.name}
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="text-center">
                          <p className="text-[#FFB000] font-bold">{scannedProduct.calories}</p>
                          <p className="text-[#32CD32]/60 text-xs">KCAL</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{scannedProduct.macros.protein}g</p>
                          <p className="text-[#32CD32]/60 text-xs">PROTEIN</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{scannedProduct.macros.carbs}g</p>
                          <p className="text-[#32CD32]/60 text-xs">CARBS</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{scannedProduct.macros.fat}g</p>
                          <p className="text-[#32CD32]/60 text-xs">FAT</p>
                        </div>
                      </div>
                      <p className="text-[#32CD32]/60 text-xs mt-2">
                        PER: {scannedProduct.servingSize}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setScannedProduct(null)}
                        className="flex-1 tactical-btn tactical-btn-danger"
                      >
                        SCAN ANOTHER
                      </button>
                      <button
                        onClick={confirmBarcodeProduct}
                        className="flex-1 tactical-btn"
                      >
                        CONFIRM
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Mode */}
            {mode === 'search' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchFoods()}
                    placeholder="SEARCH FOOD DATABASE..."
                    className="flex-1 tactical-input"
                  />
                  <button
                    onClick={searchFoods}
                    disabled={isSearching}
                    className="tactical-btn px-4"
                  >
                    {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  </button>
                </div>

                {searchResults.length > 0 && !selectedFood && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => setSelectedFood(food)}
                        className="w-full p-3 text-left bg-[#32CD32]/5 border border-[#32CD32]/30 hover:bg-[#32CD32]/10 transition-all"
                      >
                        {food.brand && (
                          <p className="text-[#32CD32]/60 text-xs">{food.brand}</p>
                        )}
                        <p className="text-[#32CD32] font-medium">{food.name}</p>
                        <p className="text-[#FFB000] text-sm">{food.calories} kcal</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedFood && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#32CD32]/10 border border-[#32CD32]/30">
                      {selectedFood.brand && (
                        <p className="text-[#32CD32]/60 text-xs mb-1">
                          {selectedFood.brand}
                        </p>
                      )}
                      <p className="text-lg font-bold text-[#32CD32] mb-2">
                        {selectedFood.name}
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="text-center">
                          <p className="text-[#FFB000] font-bold">{selectedFood.calories}</p>
                          <p className="text-[#32CD32]/60 text-xs">KCAL</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{selectedFood.macros.protein}g</p>
                          <p className="text-[#32CD32]/60 text-xs">PROTEIN</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{selectedFood.macros.carbs}g</p>
                          <p className="text-[#32CD32]/60 text-xs">CARBS</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#32CD32] font-bold">{selectedFood.macros.fat}g</p>
                          <p className="text-[#32CD32]/60 text-xs">FAT</p>
                        </div>
                      </div>
                      <p className="text-[#32CD32]/60 text-xs mt-2">
                        PER: {selectedFood.servingSize}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedFood(null)}
                        className="flex-1 tactical-btn tactical-btn-danger"
                      >
                        BACK
                      </button>
                      <button
                        onClick={confirmSearchSelection}
                        className="flex-1 tactical-btn"
                      >
                        CONFIRM
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={manualEntry.description}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="FOOD DESCRIPTION"
                  className="w-full tactical-input"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#32CD32]/60 text-xs mb-1">CALORIES *</label>
                    <input
                      type="number"
                      value={manualEntry.calories}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, calories: e.target.value }))}
                      placeholder="0"
                      className="w-full tactical-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[#32CD32]/60 text-xs mb-1">SERVING SIZE</label>
                    <input
                      type="text"
                      value={manualEntry.servingSize}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, servingSize: e.target.value }))}
                      placeholder="e.g., 1 cup"
                      className="w-full tactical-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#32CD32]/60 text-xs mb-1">PROTEIN (g)</label>
                    <input
                      type="number"
                      value={manualEntry.protein}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, protein: e.target.value }))}
                      placeholder="0"
                      className="w-full tactical-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[#32CD32]/60 text-xs mb-1">CARBS (g)</label>
                    <input
                      type="number"
                      value={manualEntry.carbs}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, carbs: e.target.value }))}
                      placeholder="0"
                      className="w-full tactical-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[#32CD32]/60 text-xs mb-1">FAT (g)</label>
                    <input
                      type="number"
                      value={manualEntry.fat}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, fat: e.target.value }))}
                      placeholder="0"
                      className="w-full tactical-input"
                    />
                  </div>
                </div>

                <button
                  onClick={submitManualEntry}
                  className="w-full tactical-btn"
                >
                  LOG INTEL
                </button>
              </div>
            )}

            {/* Recent Mode */}
            {mode === 'recent' && (
              <div className="space-y-2">
                {recentFoods.length === 0 ? (
                  <p className="text-center text-[#32CD32]/60 py-8">
                    NO RECENT INTEL LOGGED
                  </p>
                ) : (
                  recentFoods.slice(0, 10).map((food) => (
                    <button
                      key={food.id}
                      onClick={() => quickAddRecent(food)}
                      className="w-full p-3 text-left bg-[#32CD32]/5 border border-[#32CD32]/30 hover:bg-[#32CD32]/10 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[#32CD32] font-medium">{food.description}</p>
                          <p className="text-[#32CD32]/60 text-xs">
                            P: {food.macros.protein}g | C: {food.macros.carbs}g | F: {food.macros.fat}g
                          </p>
                        </div>
                        <p className="text-[#FFB000] font-bold">{food.calories}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
