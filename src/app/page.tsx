'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecon } from '@/contexts/ReconContext';

export default function HomePage() {
  const router = useRouter();
  const { operative, isLoading } = useRecon();

  useEffect(() => {
    if (!isLoading) {
      if (operative?.inductionComplete) {
        router.replace('/dashboard');
      } else {
        router.replace('/induction');
      }
    }
  }, [isLoading, operative, router]);

  return (
    <div className="min-h-screen flex items-center justify-center tactical-grid">
      <div className="text-center">
        <div className="mb-4">
          <span className="text-4xl text-glow">◉</span>
        </div>
        <p className="text-glow text-lg mb-2">OPERATION: RECON</p>
        <p className="text-[#32CD32]/60 text-sm">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    </div>
  );
}
