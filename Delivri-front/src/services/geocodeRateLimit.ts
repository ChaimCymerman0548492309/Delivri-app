/** מגביל קצב ל-Nominatim (מקסימום ~1 בקשה ל-1.5 שניות) */
let lastNominatimCall = 0;
let nominatimBlockedUntil = 0;

const MIN_INTERVAL_MS = 1500;
const BLOCK_ON_429_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const isNominatimBlocked = (): boolean => Date.now() < nominatimBlockedUntil;

export const markNominatimRateLimited = () => {
  nominatimBlockedUntil = Date.now() + BLOCK_ON_429_MS;
};

export const waitForNominatimSlot = async (): Promise<boolean> => {
  if (isNominatimBlocked()) return false;

  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastNominatimCall);
  if (wait > 0) await sleep(wait);

  lastNominatimCall = Date.now();
  return true;
};
