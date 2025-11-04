import { useState, useCallback } from 'react';

interface ApiCallTiming {
  [key: string]: number;
}

export const useApiTimer = () => {
  const [timings, setTimings] = useState<ApiCallTiming>({});
  const [loading, setLoading] = useState<boolean>(false);

  const trackApiCall = useCallback(async <T>(apiCall: () => Promise<T>, name: string): Promise<T> => {
    setLoading(true);
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;

      setTimings((prev) => ({
        ...prev,
        [name]: duration,
      }));

      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    timings,
    loading,
    trackApiCall,
  };
};
