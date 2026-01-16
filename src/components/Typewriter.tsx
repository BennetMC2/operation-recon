'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
}

export default function Typewriter({
  text,
  speed = 30,
  delay = 0,
  onComplete,
  className = '',
  showCursor = true,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayedText, text, speed, hasStarted, onComplete]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {displayedText}
      {showCursor && !isComplete && (
        <span className="animate-pulse">█</span>
      )}
    </motion.span>
  );
}

interface TypewriterLinesProps {
  lines: string[];
  lineDelay?: number;
  charSpeed?: number;
  onAllComplete?: () => void;
  className?: string;
  lineClassName?: string;
}

export function TypewriterLines({
  lines,
  lineDelay = 500,
  charSpeed = 25,
  onAllComplete,
  className = '',
  lineClassName = '',
}: TypewriterLinesProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);

  const handleLineComplete = () => {
    setCompletedLines(prev => [...prev, lines[currentLine]]);

    if (currentLine < lines.length - 1) {
      setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, lineDelay);
    } else {
      onAllComplete?.();
    }
  };

  return (
    <div className={className}>
      {completedLines.map((line, index) => (
        <p key={index} className={lineClassName}>
          {line}
        </p>
      ))}
      {currentLine < lines.length && (
        <p className={lineClassName}>
          <Typewriter
            text={lines[currentLine]}
            speed={charSpeed}
            onComplete={handleLineComplete}
            showCursor={currentLine === lines.length - 1}
          />
        </p>
      )}
    </div>
  );
}
