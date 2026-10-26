import { useState, useEffect, useRef } from 'react';

/**
 * useCountdown(expiresAt, serverOffsetMs, onExpire)
 * Counts down seconds to expiresAt adjusted for server offset.
 * Calls onExpire once when countdown reaches 0.
 */
export function useCountdown(expiresAt, serverOffsetMs = 0, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expiresAt) return 0;
    const nowServer = Date.now() + serverOffsetMs;
    const diff = Math.floor((new Date(expiresAt).getTime() - nowServer) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    expiredFiredRef.current = false;

    const tick = () => {
      const nowServer = Date.now() + serverOffsetMs;
      const diff = Math.floor((new Date(expiresAt).getTime() - nowServer) / 1000);

      if (diff <= 0) {
        setSecondsLeft(0);
        if (!expiredFiredRef.current) {
          expiredFiredRef.current = true;
          onExpireRef.current?.();
        }
      } else {
        setSecondsLeft(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, serverOffsetMs]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSeconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return {
    secondsLeft,
    formatted,
    isExpiringSoon: secondsLeft > 0 && secondsLeft <= 60,
  };
}
