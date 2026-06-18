import { useCallback, useEffect, useState } from 'react';

interface UseNavigationOptions {
  deliveryStopsCount: number;
  loadRoute: () => Promise<boolean>;
  mapFlyTo: (center: [number, number]) => void;
  currentLocation: [number, number] | null;
  startNavigationWatch: () => void;
  stopNavigationWatch: () => void;
  setRouteError: (error: string | null) => void;
  setCurrentStopIndex: (index: number) => void;
  onMobileClose?: () => void;
}

export const useNavigation = ({
  deliveryStopsCount,
  loadRoute,
  mapFlyTo,
  currentLocation,
  startNavigationWatch,
  stopNavigationWatch,
  setRouteError,
  setCurrentStopIndex,
  onMobileClose,
}: UseNavigationOptions) => {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(async () => {
    if (deliveryStopsCount === 0) {
      setRouteError('אנא הוסף לפחות תחנה אחת לפני תחילת הניווט');
      return;
    }

    const success = await loadRoute();
    if (!success) {
      setRouteError('לא ניתן לטעון את המסלול. נסה שוב.');
      return;
    }

    setIsNavigating(true);
    setCurrentStopIndex(0);
    if (currentLocation) mapFlyTo(currentLocation);
    startNavigationWatch();
    onMobileClose?.();
  }, [
    deliveryStopsCount,
    loadRoute,
    setRouteError,
    setCurrentStopIndex,
    currentLocation,
    mapFlyTo,
    startNavigationWatch,
    onMobileClose,
  ]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    stopNavigationWatch();
  }, [stopNavigationWatch]);

  return { isNavigating, setIsNavigating, startNavigation, stopNavigation };
};

export const useVoiceGuidance = (
  isNavigating: boolean,
  steps: { instruction: string }[],
  currentStepIndex: number,
) => {
  useEffect(() => {
    if (isNavigating && steps.length > 0) {
      const step = steps[currentStepIndex];
      if (step) speechSynthesis.speak(new SpeechSynthesisUtterance(step.instruction));
    }
  }, [currentStepIndex, isNavigating, steps]);
};
