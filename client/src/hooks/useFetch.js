import { useState, useEffect, useCallback, useRef } from 'react';
import { getErrorMessage } from '../api/axios.js';

/**
 * useFetch(asyncFn, deps)
 * Calls asyncFn whenever deps change.
 * Prevents race conditions and ignores responses if unmounted.
 */
export function useFetch(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a reference to the latest call ID to avoid stale state updates
  const callIdRef = useRef(0);

  const execute = useCallback(async () => {
    const currentCallId = ++callIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      if (currentCallId === callIdRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (currentCallId === callIdRef.current) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();

    return () => {
      // Mark as invalidated
      callIdRef.current++;
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
