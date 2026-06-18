import { useCallback, useEffect, useState } from 'react';
import type { DeliveryStop } from '../types/types';

const STORAGE_KEY = 'deliveryStops';

export const useDeliveryStops = () => {
  const [deliveryStops, setDeliveryStops] = useState<DeliveryStop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [pendingStop, setPendingStop] = useState<DeliveryStop | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setDeliveryStops(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveryStops));
  }, [deliveryStops]);

  const handleAddStop = useCallback((address: string, coordinates: [number, number]) => {
    if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) return false;

    const newStop: DeliveryStop = {
      id: `stop-${Date.now()}`,
      address,
      coordinates,
      completed: false,
      order: deliveryStops.length,
    };

    setDeliveryStops((prev) => [...prev, newStop]);
    return true;
  }, [deliveryStops.length]);

  const handleRemoveStop = useCallback((stopId: string) => {
    setDeliveryStops((prev) =>
      prev.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, order: i })),
    );
  }, []);

  const handlePostponeStop = useCallback(
    (stopId: string) => {
      const stop = deliveryStops.find((s) => s.id === stopId);
      if (!stop) return;
      setPendingStop(stop);
      setPostponeDialogOpen(true);
    },
    [deliveryStops],
  );

  const handleConfirmPostpone = useCallback(() => {
    if (!pendingStop) return;
    setDeliveryStops((prev) => {
      const remaining = prev.filter((s) => s.id !== pendingStop.id);
      return [...remaining, pendingStop];
    });
    setPendingStop(null);
    setPostponeDialogOpen(false);
  }, [pendingStop]);

  const handleCancelPostpone = useCallback(() => {
    setPostponeDialogOpen(false);
    setPendingStop(null);
  }, []);

  const handleCompleteStop = useCallback(
    (stopId: string, onLastStop?: () => void) => {
      setDeliveryStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, completed: true } : s)));

      const currentIndex = deliveryStops.findIndex((s) => s.id === stopId);
      if (currentIndex === currentStopIndex && currentIndex < deliveryStops.length - 1) {
        setCurrentStopIndex(currentIndex + 1);
      }
      if (currentIndex === deliveryStops.length - 1) {
        onLastStop?.();
      }
    },
    [deliveryStops, currentStopIndex],
  );

  const handleUpdateStop = useCallback(
    (stopId: string, updates: Partial<Pick<DeliveryStop, 'address' | 'coordinates' | 'note'>>) => {
      setDeliveryStops((prev) =>
        prev.map((s) => (s.id === stopId ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  return {
    deliveryStops,
    currentStopIndex,
    setCurrentStopIndex,
    postponeDialogOpen,
    pendingStop,
    handleAddStop,
    handleRemoveStop,
    handlePostponeStop,
    handleConfirmPostpone,
    handleCancelPostpone,
    handleCompleteStop,
    handleUpdateStop,
  };
};
