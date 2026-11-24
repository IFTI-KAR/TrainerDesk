import { useCallback, useEffect, useRef, useState } from 'react';

function playCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_err) {
    // Ignore audio context restriction
  }
}

export function useRestTimer() {
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playCompletionChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback((seconds = 60) => {
    const duration = Math.max(5, Number(seconds) || 60);
    setTotalSeconds(duration);
    setSecondsLeft(duration);
    setIsRunning(true);
    setIsVisible(true);
  }, []);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev > 0) setIsRunning(true);
      return prev;
    });
  }, []);

  const adjust = useCallback((delta) => {
    setSecondsLeft((prev) => {
      const next = Math.max(0, prev + delta);
      if (delta > 0 && next > 0) {
        setTotalSeconds((t) => Math.max(t, next));
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(false);
  }, [totalSeconds]);

  const dismiss = useCallback(() => {
    setIsRunning(false);
    setIsVisible(false);
  }, []);

  return {
    secondsLeft,
    totalSeconds,
    isRunning,
    isVisible,
    start,
    pause,
    resume,
    adjust,
    reset,
    dismiss,
  };
}

export default useRestTimer;
