import { geocodeAddress } from '../services/geocoding';
import { getRouteData, optimizeRouteWithTSP } from '../services/routeService';

export const useRouteOptimization = () => ({
  geocodeAddress,
  optimizeRouteWithTSP,
  getRouteData,
});
