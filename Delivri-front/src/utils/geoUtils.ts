type Coordinates = [number, number];

export const haversineKm = (a: Coordinates, b: Coordinates): number => {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** מפתח יציב לשמות עיר מ-data.gov.il */
export const normalizeCityKey = (name: string): string =>
  name.replace(/\s+/g, ' ').trim();

export const normalizeCityName = (name: string): string =>
  normalizeCityKey(name)
    .replace(/['"״'`]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/-\s*/g, '-')
    .toLowerCase();

/** מפתח יציב למיקום GPS — מונע re-run על כל tick */
export const locationStableKey = (location: Coordinates, precision = 3): string =>
  `${location[0].toFixed(precision)},${location[1].toFixed(precision)}`;

export const citiesMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const aBase = na.split(' ')[0];
  const bBase = nb.split(' ')[0];
  return aBase.length >= 3 && aBase === bBase;
};

export const findBestCityMatch = (cities: string[], rawName: string | null): string | null => {
  if (!rawName) return null;

  const exact = cities.find((c) => citiesMatch(c, rawName));
  if (exact) return exact;

  const normRaw = normalizeCityName(rawName);
  const words = normRaw.split(' ').filter((w) => w.length >= 2);

  let best: { city: string; score: number } | null = null;

  for (const city of cities) {
    const normCity = normalizeCityName(city);
    let score = 0;

    if (normCity === normRaw) score = 100;
    else if (normCity.includes(normRaw) || normRaw.includes(normCity)) score = 80;
    else {
      const matchedWords = words.filter((w) => normCity.includes(w));
      score = matchedWords.length * 15;
      if (words[0] && normCity.startsWith(words[0])) score += 20;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { city, score };
    }
  }

  return best && best.score >= 15 ? best.city : null;
};

/** שאילתת geocode נקייה — בלי רווחים כפולים / ישראל+Israel */
export const normalizeGeocodeQuery = (query: string): string => {
  const trimmed = query.replace(/\s+/g, ' ').trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('israel') || trimmed.includes('ישראל')) return trimmed;
  return `${trimmed}, Israel`;
};
